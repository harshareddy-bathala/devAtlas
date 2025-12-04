import { ReactNode } from 'react';

type InputType = 'text' | 'email' | 'password' | 'url' | 'number' | 'tel';

interface BaseFieldProps {
  label: string;
  fieldName: string;  // Renamed to avoid conflict with HTML name attribute
  error?: string;
  required?: boolean;
  helperText?: string;
  icon?: ReactNode;
}

interface InputFieldProps extends BaseFieldProps {
  type?: InputType;
  placeholder?: string;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
}

interface TextareaFieldProps extends BaseFieldProps {
  type: 'textarea';
  rows?: number;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  disabled?: boolean;
  className?: string;
}

interface SelectFieldProps extends BaseFieldProps {
  type: 'select';
  options: { value: string; label: string }[];
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  disabled?: boolean;
  className?: string;
}

type FormFieldProps = InputFieldProps | TextareaFieldProps | SelectFieldProps;

export function FormField(props: FormFieldProps) {
  const { label, fieldName, error, required, helperText, icon } = props;
  
  const baseInputClasses = `input-field w-full ${error ? 'border-red-500 focus:ring-red-500' : ''}`;
  
  const renderField = () => {
    if (props.type === 'textarea') {
      const { rows = 3, placeholder, value, onChange, disabled, className = '' } = props as TextareaFieldProps;
      return (
        <textarea
          id={fieldName}
          name={fieldName}
          rows={rows}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={`${baseInputClasses} min-h-[80px] resize-none ${className}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${fieldName}-error` : helperText ? `${fieldName}-helper` : undefined}
        />
      );
    }

    if (props.type === 'select') {
      const { options, value, onChange, disabled, className = '' } = props as SelectFieldProps;
      return (
        <select
          id={fieldName}
          name={fieldName}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={`${baseInputClasses} ${className}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${fieldName}-error` : helperText ? `${fieldName}-helper` : undefined}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    // Default: input field
    const { type = 'text', placeholder, value, onChange, disabled, autoFocus, className = '' } = props as InputFieldProps;
    return (
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
            {icon}
          </span>
        )}
        <input
          id={fieldName}
          name={fieldName}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          autoFocus={autoFocus}
          className={`${baseInputClasses} ${icon ? 'pl-10' : ''} ${className}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${fieldName}-error` : helperText ? `${fieldName}-helper` : undefined}
        />
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <label htmlFor={fieldName} className="block text-sm text-gray-400">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      
      {renderField()}
      
      {error && (
        <p id={`${fieldName}-error`} className="text-red-400 text-xs" role="alert">
          {error}
        </p>
      )}
      
      {helperText && !error && (
        <p id={`${fieldName}-helper`} className="text-gray-500 text-xs">
          {helperText}
        </p>
      )}
    </div>
  );
}

export default FormField;
