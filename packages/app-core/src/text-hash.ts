/** Empreinte de texte partagée par la garde d'écriture et la sauvegarde avant migration (aucune dépendance). */
/** Empreinte FNV-1a 32 bits du texte, préfixée de sa longueur (détection de changement, pas de sécurité). */
export function textHash(text: string): string {
  // technical-constant: base de décalage FNV-1a 32 bits
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    // technical-constant: nombre premier FNV 32 bits
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  // technical-constant: base hexadécimale
  return `${String(text.length)}:${h.toString(16)}`;
}
