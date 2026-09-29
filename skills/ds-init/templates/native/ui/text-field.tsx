import { useId, type ComponentProps, type ReactNode } from 'react'
import { cx } from './cx.ts'
import styles from './field.module.css'

type FieldProps = {
  label: string
  hint?: ReactNode
  /** Error message(s) from a server action; also sets aria-invalid. */
  errors?: string[]
}

export function TextField({ label, hint, errors, className, id, ...rest }: FieldProps & ComponentProps<'input'>) {
  const autoId = useId()
  const inputId = id ?? autoId
  const describedBy = errors?.length ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
  return (
    <div className={cx(styles.field, className)}>
      <div className={styles.labelRow}>
        <label htmlFor={inputId} className={styles.label}>{label}</label>
      </div>
      <input id={inputId} className={styles.control} aria-invalid={errors?.length ? true : undefined} aria-describedby={describedBy} {...rest} />
      <FieldMessage id={inputId} hint={hint} errors={errors} />
    </div>
  )
}

export function FieldMessage({ id, hint, errors }: { id: string; hint?: ReactNode; errors?: string[] }) {
  if (errors?.length) return <p id={`${id}-error`} className={styles.error} role="alert">{errors.join(' ')}</p>
  if (hint) return <p id={`${id}-hint`} className={styles.hint}>{hint}</p>
  return null
}
