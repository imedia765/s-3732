import { Card } from "@/components/ui/card";
import { Users } from "lucide-react";

interface FamilyMemberCardProps {
  name: string | null;
  relationship: string | null;
  dob: string | null;
  gender: string | null;
  memberNumber: string | null;
}

const FamilyMemberCard = ({ name, relationship, dob, gender, memberNumber }: FamilyMemberCardProps) => {
  if (!name && !relationship && !dob && !gender) {
    return null;
  }

  return (
    <Card className="p-4 bg-[#F2FCE2] border-[#0EA5E9]/20 hover:border-[#0EA5E9]/40 transition-all duration-300">
      <div className="flex items-start gap-4">
        <div className="p-2 rounded-full bg-[#0EA5E9]/10">
          <Users className="w-5 h-5 text-[#0EA5E9]" />
        </div>
        
        <div className="space-y-1">
          <h3 className="text-lg font-medium text-gray-900">
            {name || 'Not provided'}
          </h3>
          
          <div className="space-y-1 text-sm text-gray-600">
            {memberNumber && (
              <p>
                <span className="font-medium">Member Number:</span> {memberNumber}
              </p>
            )}
            
            {relationship && (
              <p>
                <span className="font-medium">Relationship:</span> {relationship}
              </p>
            )}
            
            {dob && (
              <p>
                <span className="font-medium">Date of Birth:</span> {dob}
              </p>
            )}
            
            {gender && (
              <p>
                <span className="font-medium">Gender:</span> {gender}
              </p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default FamilyMemberCard;