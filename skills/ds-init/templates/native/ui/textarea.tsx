'use client'

import { useId, useState, type ComponentProps, type ReactNode } from 'react'
import { cx } from './cx.ts'
import { FieldMessage } from './text-field.tsx'
import styles from './field.module.css'

type TextAreaProps = ComponentProps<'textarea'> & {
  label: string
  hint?: ReactNode
  errors?: string[]
  /** Show a live character counter against maxLength. */
  counter?: boolean
}

export function TextArea({ label, hint, errors, counter, className, id, maxLength, defaultValue, onChange, ...rest }: TextAreaProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const [length, setLength] = useState(String(defaultValue ?? '').length)
  const over = maxLength !== undefined && length > maxLength
  return (
    <div className={cx(styles.field, className)}>
      <div className={styles.labelRow}>
        <label htmlFor={inputId} className={styles.label}>{label}</label>
        {counter && maxLength ? (
          <span className={cx(styles.counter, over && styles.over)} aria-live="polite">{length} / {maxLength}</span>
        ) : null}
      </div>
      <textarea
        id={inputId}
        className={cx(styles.control, styles.textarea)}
        maxLength={maxLength}
        defaultValue={defaultValue}
        aria-invalid={errors?.length ? true : undefined}
        aria-describedby={errors?.length ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        onChange={(event) => {
          setLength(event.currentTarget.value.length)
          onChange?.(event)
        }}
        {...rest}
      />
      <FieldMessage id={inputId} hint={hint} errors={errors} />
    </div>
  )
}
