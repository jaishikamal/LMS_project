export type SelectOption = {
  value: string | number;
  label: string;
};

/**
 * react-hook-form reports array/object fields with nested merged error shapes
 * rather than a plain `FieldError`. This component only renders `message`, so
 * accept anything that carries one instead of mirroring RHF's full union.
 */
type AnyFieldError = { message?: unknown } | undefined;

type SelectFieldProps = {
  label: string;
  name: string;
  register: any;
  options: SelectOption[];
  defaultValue?: string | number | (string | number)[];
  error?: AnyFieldError;
  multiple?: boolean;
  /** Adds a blank choice, for genuinely optional relations. */
  placeholder?: string;
};

const SelectField = ({
  label,
  name,
  register,
  options,
  defaultValue,
  error,
  multiple,
  placeholder,
}: SelectFieldProps) => {
  return (
    <div className="flex flex-col gap-2 w-full md:w-1/4">
      <label className="text-xs text-gray-500">{label}</label>
      <select
        multiple={multiple}
        className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
        {...register(name)}
        defaultValue={defaultValue}
      >
        {placeholder && !multiple && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error?.message ? (
        <p className="text-xs text-red-400">{String(error.message)}</p>
      ) : null}
    </div>
  );
};

export default SelectField;
