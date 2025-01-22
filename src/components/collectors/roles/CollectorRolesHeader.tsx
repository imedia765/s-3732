import { Dispatch, SetStateAction } from 'react';
import { UserRole } from "@/types/collector-roles";

interface CollectorRolesHeaderProps {
  selectedRole: UserRole | 'all';
  onRoleChange: Dispatch<SetStateAction<UserRole | 'all'>>;
  totalCount: number;
  filteredCount: number;
}

export const CollectorRolesHeader = ({
  selectedRole,
  onRoleChange,
  totalCount,
  filteredCount
}: CollectorRolesHeaderProps) => {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-lg font-semibold">Collector Roles</h2>
        <p className="text-sm text-muted-foreground">
          Showing {filteredCount} of {totalCount} collectors
        </p>
      </div>
      <div className="flex items-center space-x-2">
        <select
          value={selectedRole}
          onChange={(e) => onRoleChange(e.target.value as UserRole | 'all')}
          className="select"
        >
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="collector">Collector</option>
          <option value="member">Member</option>
        </select>
      </div>
    </div>
  );
};
