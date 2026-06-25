import { useNavigate } from 'react-router-dom';
import { useAppStore, getDefaultRouteForRole } from '../../store';
import type { UserRole } from '../../types';
import { Select } from '../ui/Select';

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'rep', label: 'Jordan — Rep' },
  { value: 'team_lead', label: 'Alex — Team Lead' },
  { value: 'manager', label: 'Sam — Manager' },
];

export function RoleSwitcher() {
  const navigate = useNavigate();
  const activeUser = useAppStore((s) => s.getActiveUser());
  const setActiveUserByRole = useAppStore((s) => s.setActiveUserByRole);

  const handleChange = (role: UserRole) => {
    setActiveUserByRole(role);
    navigate(getDefaultRouteForRole(role));
  };

  return (
    <div className="role-switcher">
      <Select
        id="role-select"
        value={activeUser.role}
        onChange={(e) => handleChange(e.target.value as UserRole)}
        aria-label="Viewing as"
      >
        {ROLE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </Select>
    </div>
  );
}
