import { useLayoutEffect, useRef } from 'react';
import type { ComponentProps } from 'react';

/** Presentation only: fit long numeric text inside the existing field; values and edit events are unchanged. */
export function FittedNumericInput(props: ComponentProps<'input'>) {
  const ref = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => {
    const input = ref.current;
    if (!input) return;
    let active = true;
    const fit = () => {
      if (!active || !input.clientWidth) return;
      input.style.removeProperty('font-size');
      const css = getComputedStyle(input);
      const context = document.createElement('canvas').getContext('2d');
      if (!context) return;
      context.font = css.font;
      const text = input.value || input.placeholder;
      const spacing = Number.parseFloat(css.letterSpacing) || 0;
      const width = context.measureText(text).width + Math.max(0, text.length - 1) * spacing;
      const available = input.clientWidth - 1;
      if (width > available) input.style.fontSize = `${Math.floor(Number.parseFloat(css.fontSize) * available / width * 100) / 100}px`;
    };
    fit();
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(fit);
    observer?.observe(input);
    void document.fonts?.ready.then(fit);
    return () => { active = false; observer?.disconnect(); };
  }, [props.value, props.placeholder]);
  return <input {...props} ref={ref}/>;
}
