import { FormControl, FormLabel, Select } from "@chakra-ui/react";

export interface RoleOption {
  _id: string;
  name: string;
}

interface Props {
  label?: string;
  roles: RoleOption[];
  value: string | null;
  onChange: (roleId: string) => void;
  isDisabled?: boolean;
}

export default function RoleSelector({
  label = "RBAC role",
  roles,
  value,
  onChange,
  isDisabled,
}: Props) {
  return (
    <FormControl>
      <FormLabel>{label}</FormLabel>
      <Select
        placeholder="Select role"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        isDisabled={isDisabled}
      >
        {roles.map((r) => (
          <option key={r._id} value={r._id}>
            {r.name}
          </option>
        ))}
      </Select>
    </FormControl>
  );
}
