import * as React from "react"
import { FieldPath, FieldValues, useFormContext } from "react-hook-form"

export type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = {
  name: TName
}

export const FormFieldContext = React.createContext<FormFieldContextValue>(
  {} as FormFieldContextValue
)

export type FormItemContextValue = {
  id: string
}

export const FormItemContext = React.createContext<FormItemContextValue>(
  {} as FormItemContextValue
)

export const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext)
  const itemContext = React.useContext(FormItemContext)
  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>")
  }
    const { getFieldState, formState } = useFormContext()
  
    // getFieldState expects a field name compatible with the form's field values.
    // We conservatively type it as unknown and let the caller ensure correct generic usage.
    const fieldName = fieldContext.name as unknown as FieldPath<FieldValues>
  
    const fieldState = getFieldState(fieldName, formState)

  const { id } = itemContext

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  }
}
 
  // Remove default export
