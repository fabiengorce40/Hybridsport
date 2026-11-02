"""Read-only release guard. Never creates, deletes or modifies any Cloudflare resource."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import urllib.request

BASE = 'https://rekka-v2-android-test.pages.dev/'
OLD = '3ec81a84c8e19acc1243a1aa32a214e08acfa89e'
STATE = Path('/tmp/rekka-v21-isolation.json')
ROOT = Path('apps/kairo')

def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'REKKA-isolated-icon-check', 'Cache-Control':'no-cache'})
    with urllib.request.urlopen(req, timeout=30) as response:
        expected = url.replace('/index.html', '/')
        assert response.geturl().split('?')[0] == expected.split('?')[0], 'Unexpected redirect'
        return response.read()

def project(name):
    url = 'https://api.cloudflare.com/client/v4/accounts/'+os.environ['CF_ACCOUNT']+'/pages/projects/'+name
    req = urllib.request.Request(url, headers={'Authorization':'Bearer '+os.environ['CF_TOKEN']})
    with urllib.request.urlopen(req, timeout=30) as response: data = json.load(response)
    assert data['success']
    return data['result']

def isolation(test, beta):
    assert test['name']=='rekka-v2-android-test'
    assert test['id'] and test['id']!=beta['id']
    assert test['subdomain']=='rekka-v2-android-test.pages.dev'
    assert beta['subdomain']=='rekka-beta.pages.dev'
    assert test['production_branch']=='android-test' and not test.get('source')
    assert set(test.get('domains',[])) == {'rekka-v2-android-test.pages.dev'}
    for cfg in test.get('deployment_configs',{}).values():
        for key in ('env_vars','kv_namespaces','d1_databases','r2_buckets','services','durable_object_namespaces','hyperdrive_bindings','vectorize_bindings','ai_bindings','analytics_engine_datasets','queues','mtls_certificates','vpc_services'):
            assert not cfg.get(key), 'Unexpected binding: '+key

def commit(test):
    return test['canonical_deployment']['deployment_trigger']['metadata']['commit_hash']

mode = sys.argv[1]
test = project('rekka-v2-android-test'); beta = project('rekka-beta')
isolation(test,beta)
production = get('https://fabiengorce40.github.io/Hybridsport/version.json').decode()
if mode=='preflight':
    assert commit(test)==OLD, 'ESSAI version changed: STOP before publication'
    assert json.loads(get(BASE+'version.json'))=={'commit':OLD,'channel':'android-test'}
    manifest = json.loads(get(BASE+'manifest.webmanifest'))
    assert manifest['id']=='./?kairo-channel=android-test'
    assert manifest['scope']==manifest['start_url']=='./'
    assert manifest['name']==manifest['short_name']=='REKKA ESSAI'
    oldmeta = json.loads(subprocess.check_output(['git','show',OLD+':apps/kairo/resources/android-test-icons/icons.json']))
    assert oldmeta == json.loads((ROOT/'resources/android-test-icons/icons.json').read_text()), 'Corrected icons changed'
    icon_dir=oldmeta['asset_version']+'-'+oldmeta['revision']
    assert oldmeta['protected_neon_radius']<.4
    for filename,sha in oldmeta['files'].items():
        assert hashlib.sha256(get(BASE+'icons/'+icon_dir+'/'+filename)).hexdigest()==sha, filename
    STATE.write_text(json.dumps({'beta':beta,'production':production,'id':test['id'],'manifest':manifest},sort_keys=True))
    print('LIVE 3ec81a8 CONFIRMED: corrected icons intact, stable PWA identity, isolation PASS.')
else:
    before = json.loads(STATE.read_text())
    assert beta==before['beta'], 'BETA changed: STOP'
    assert production==before['production'], 'Production changed: STOP'
    assert test['id']==before['id']
    if mode=='prepublish':
        assert commit(test)==OLD, 'ESSAI changed since preflight: STOP'
        print('Immediate prepublication isolation PASS; existing ESSAI only.')
    elif mode=='post':
        for attempt in range(12):
            test=project('rekka-v2-android-test')
            if commit(test)==os.environ['GITHUB_SHA']: break
            if attempt==11: raise RuntimeError('Deployment commit not confirmed')
            time.sleep(5)
        isolation(test,beta)
        assert test['canonical_deployment']['environment']=='production'
        assert test['canonical_deployment']['latest_stage']['status']=='success'
        local=ROOT/'dist-android-test'
        for attempt in range(12):
            try:
                assert json.loads(get(BASE+'version.json?verify='+os.environ['GITHUB_SHA']))['commit']==os.environ['GITHUB_SHA']
                break
            except AssertionError:
                if attempt==11: raise
                time.sleep(5)
        m=json.loads(get(BASE+'manifest.webmanifest'))
        assert m==json.loads((local/'manifest.webmanifest').read_text())
        assert all(m[key]==before['manifest'][key] for key in ('id','scope','start_url','name','short_name'))
        assert all('fullbleed-v2-' in icon['src'] for icon in m['icons'])
        icon_dir=m['icons'][0]['src'].rsplit('/',1)[0]
        meta=json.loads((ROOT/'resources/android-test-icons/icons.json').read_text())
        html=(local/'index.html').read_text()
        import re
        entry=re.search(r'src="\./(assets/[^"]+\.js)"',html).group(1)
        assert 'Confirmer ma personnalisation' in (local/entry).read_text(), 'V2.1 onboarding absent'
        paths=['sw.js','index.html','favicon.ico',entry]+[icon_dir+'/'+f for f in meta['files']]
        for path in paths:
            assert hashlib.sha256(get(BASE+path)).digest()==hashlib.sha256((local/path).read_bytes()).digest(),path
        assert meta['revision'] in get(BASE+'sw.js').decode()
        assert os.environ['GITHUB_SHA'][:12] in get(BASE+'sw.js').decode()
        assert project('rekka-beta')==before['beta']
        assert get('https://fabiengorce40.github.io/Hybridsport/version.json').decode()==before['production']
        print('PASS: served V2.1 JS bundle, manifest, all corrected icons, release worker; BETA/production unchanged.')
        print('COMMIT:',os.environ['GITHUB_SHA'],'URL:',BASE)
    else: raise ValueError(mode)
