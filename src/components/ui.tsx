import { useId, useState, type ReactNode } from 'react';
import { toolBySlug } from '../tools/registry';

export function ToolHeader({ slug, children }: { slug: string; children?: ReactNode }) {
  const tool = toolBySlug.get(slug);
  return (
    <header className="tool-header">
      <h1>{tool?.name ?? slug}</h1>
      <p>{tool?.description}</p>
      {children}
    </header>
  );
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function CopyButton({ value, label = 'Copy' }: { value: string; label?: string }) {
  const [state, setState] = useState<'idle' | 'ok' | 'fail'>('idle');
  return (
    <>
      <button
        type="button"
        className="btn small"
        disabled={!value}
        onClick={async () => {
          setState((await copyText(value)) ? 'ok' : 'fail');
          setTimeout(() => setState('idle'), 1500);
        }}
      >
        {state === 'ok' ? 'Copied' : state === 'fail' ? 'Copy failed' : label}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {state === 'ok' ? 'Copied to clipboard' : state === 'fail' ? 'Copy failed' : ''}
      </span>
    </>
  );
}

interface TextAreaProps {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  rows?: number;
  placeholder?: string;
  readOnly?: boolean;
  copy?: boolean;
  hint?: string;
}

export function TextArea({ label, value, onChange, rows = 8, placeholder, readOnly, copy, hint }: TextAreaProps) {
  const id = useId();
  return (
    <div className="field">
      <div className="field-head">
        <label htmlFor={id}>{label}</label>
        {copy && <CopyButton value={value} />}
      </div>
      <textarea
        id={id}
        value={value}
        rows={rows}
        placeholder={placeholder}
        readOnly={readOnly}
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        onChange={(e) => onChange?.(e.target.value)}
        aria-describedby={hint ? id + '-hint' : undefined}
      />
      {hint && (
        <small id={id + '-hint'} className="hint">
          {hint}
        </small>
      )}
    </div>
  );
}

export const Output = (props: Omit<TextAreaProps, 'onChange' | 'readOnly'>) => (
  <TextArea {...props} readOnly copy />
);

interface InputProps {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: 'text' | 'number' | 'url' | 'datetime-local';
  min?: number;
  max?: number;
  step?: number | 'any';
  placeholder?: string;
  mono?: boolean;
  hint?: string;
}

export function Input({ label, value, onChange, type = 'text', min, max, step, placeholder, mono, hint }: InputProps) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        className={mono ? 'mono' : undefined}
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={hint ? id + '-hint' : undefined}
      />
      {hint && (
        <small id={id + '-hint'} className="hint">
          {hint}
        </small>
      )}
    </div>
  );
}

export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly (readonly [T, string])[];
  onChange: (v: T) => void;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map(([v, text]) => (
          <option key={v} value={v}>
            {text}
          </option>
        ))}
      </select>
    </div>
  );
}

export function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  const id = useId();
  return (
    <div className="check">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <label htmlFor={id}>{label}</label>
    </div>
  );
}

export function ErrorLine({ error }: { error?: string | null }) {
  return error ? (
    <p className="error" role="alert">
      {error}
    </p>
  ) : null;
}

export function Row({ children }: { children: ReactNode }) {
  return <div className="row">{children}</div>;
}
