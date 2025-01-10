import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Member } from "@/types/member";

interface AddFamilyMemberDialogProps {
  member: Member;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFamilyMemberAdded: () => void;
}

const AddFamilyMemberDialog = ({ member, open, onOpenChange, onFamilyMemberAdded }: AddFamilyMemberDialogProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    full_name: '',
    relationship: '',
    date_of_birth: '',
    gender: ''
  });

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('family_members')
        .insert({
          member_id: member.id,
          member_number: null, // This will trigger the database function to generate the number
          full_name: formData.full_name,
          relationship: formData.relationship,
          date_of_birth: formData.date_of_birth,
          gender: formData.gender
        });

      if (error) {
        if (error.message.includes('Maximum of 4 spouses')) {
          toast({
            title: "Error",
            description: "Maximum of 4 spouses allowed per member",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }

      toast({
        title: "Success",
        description: "Family member added successfully",
      });
      onFamilyMemberAdded();
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding family member:', error);
      toast({
        title: "Error",
        description: "Failed to add family member",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-dashboard-card border-dashboard-accent1/20">
        <DialogHeader>
          <DialogTitle className="text-white text-xl">Add Family Member</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right text-dashboard-text">
              Name
            </Label>
            <Input
              id="name"
              value={formData.full_name}
              onChange={(e) => setFormData({...formData, full_name: e.target.value})}
              className="col-span-3 bg-dashboard-dark text-white border-dashboard-accent1/20"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="relationship" className="text-right text-dashboard-text">
              Relationship
            </Label>
            <Select
              value={formData.relationship}
              onValueChange={(value) => setFormData({...formData, relationship: value})}
            >
              <SelectTrigger className="col-span-3 bg-dashboard-dark text-white border-dashboard-accent1/20">
                <SelectValue placeholder="Select relationship" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="spouse">Spouse</SelectItem>
                <SelectItem value="dependant">Dependant</SelectItem>
                <SelectItem value="adopted">Adopted</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="dob" className="text-right text-dashboard-text">
              Date of Birth
            </Label>
            <Input
              id="dob"
              type="date"
              value={formData.date_of_birth}
              onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})}
              className="col-span-3 bg-dashboard-dark text-white border-dashboard-accent1/20"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="gender" className="text-right text-dashboard-text">
              Gender
            </Label>
            <Select
              value={formData.gender}
              onValueChange={(value) => setFormData({...formData, gender: value})}
            >
              <SelectTrigger className="col-span-3 bg-dashboard-dark text-white border-dashboard-accent1/20">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="bg-dashboard-dark text-dashboard-text hover:bg-dashboard-card hover:text-white"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            className="bg-dashboard-accent1 text-white hover:bg-dashboard-accent1/80"
          >
            Add Family Member
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddFamilyMemberDialog;