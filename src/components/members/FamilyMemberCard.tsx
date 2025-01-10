import { Card } from "@/components/ui/card";
import { Users } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";

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
        
        <div className="w-full">
          <Table>
            <TableBody>
              <TableRow className="border-b border-[#0EA5E9]/10">
                <TableCell className="py-2 text-[#1A1F2C] font-medium">Name</TableCell>
                <TableCell className="py-2 text-[#403E43]">{name || 'Not provided'}</TableCell>
              </TableRow>
              
              {memberNumber && (
                <TableRow className="border-b border-[#0EA5E9]/10">
                  <TableCell className="py-2 text-[#1A1F2C] font-medium">Member Number</TableCell>
                  <TableCell className="py-2 text-[#403E43]">{memberNumber}</TableCell>
                </TableRow>
              )}
              
              {relationship && (
                <TableRow className="border-b border-[#0EA5E9]/10">
                  <TableCell className="py-2 text-[#1A1F2C] font-medium">Relationship</TableCell>
                  <TableCell className="py-2 text-[#403E43] capitalize">{relationship}</TableCell>
                </TableRow>
              )}
              
              {dob && (
                <TableRow className="border-b border-[#0EA5E9]/10">
                  <TableCell className="py-2 text-[#1A1F2C] font-medium">Date of Birth</TableCell>
                  <TableCell className="py-2 text-[#403E43]">{dob}</TableCell>
                </TableRow>
              )}
              
              {gender && (
                <TableRow className="border-b border-[#0EA5E9]/10">
                  <TableCell className="py-2 text-[#1A1F2C] font-medium">Gender</TableCell>
                  <TableCell className="py-2 text-[#403E43] capitalize">{gender}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </Card>
  );
};

export default FamilyMemberCard;