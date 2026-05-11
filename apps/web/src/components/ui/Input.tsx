import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import styles from './Input.module.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, id, className, ...props }: InputProps) {
  const cls = [styles.input, error ? styles.hasError : '', className].filter(Boolean).join(' ');
  return (
    <div className={styles.field}>
      {label && <label htmlFor={id} className={styles.label}>{label}</label>}
      <input id={id} className={cls} {...props} />
      {error && <span className={styles.errorMsg}>{error}</span>}
    </div>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, id, className, ...props }: TextareaProps) {
  const cls = [styles.textarea, error ? styles.hasError : '', className].filter(Boolean).join(' ');
  return (
    <div className={styles.field}>
      {label && <label htmlFor={id} className={styles.label}>{label}</label>}
      <textarea id={id} className={cls} {...props} />
      {error && <span className={styles.errorMsg}>{error}</span>}
    </div>
  );
}
