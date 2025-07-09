'use client';

import { useState, useEffect } from 'react';
import { Search, Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import TeamMemberCard from './TeamMemberCard';
import { Badge } from '@/components/ui/badge';
import type { Database } from '@/lib/supabase/database.types';

type TeamMember = Database['public']['Tables']['ClickUpUsers']['Row'];

interface TeamMemberListProps {
  initialTeamMembers: TeamMember[];
}

export default function TeamMemberList({ initialTeamMembers }: TeamMemberListProps) {
  const router = useRouter();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(initialTeamMembers);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Filter team members based on search term
  const filteredTeamMembers = teamMembers.filter(member =>
    member.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.clickup_user_id?.includes(searchTerm)
  );

  // Refresh team members list
  const refreshTeamMembers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/team-members');
      if (response.ok) {
        const updatedTeamMembers = await response.json();
        setTeamMembers(updatedTeamMembers);
      }
    } catch (error) {
      console.error('Error refreshing team members:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTeamMemberDeleted = () => {
    refreshTeamMembers();
  };

  const handleAddTeamMember = () => {
    router.push('/team-members/new');
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          
          <h1 className="text-2xl font-bold">Team Members</h1>
          <Badge variant="secondary" className="ml-2 px-1 font-medium">
            {filteredTeamMembers.length} {filteredTeamMembers.length === 1 ? 'member' : 'members'}
          </Badge>
        </div>
        <Button onClick={handleAddTeamMember} className="gap-2">
         
          Add Team Member
        </Button>
      </div>

      {/* Search */}
      <div>
        <p className="text-sm text-gray-600 mb-8">
        Team members added here will have their time entries synced from ClickUp.
        </p>
        <div className="relative mb-8">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search team members by username or ClickUp ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Team Members Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 rounded-lg h-40"></div>
            </div>
          ))}
        </div>
      ) : filteredTeamMembers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTeamMembers.map((member) => (
            <TeamMemberCard
              key={member.id}
              teamMember={member}
              onTeamMemberDeleted={handleTeamMemberDeleted}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          {searchTerm ? (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No team members found</h3>
              <p className="text-gray-500">
                No team members match your search for "{searchTerm}"
              </p>
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No team members yet</h3>
              <p className="text-gray-500 mb-4">
                Get started by adding your first team member to the system
              </p>
              <Button onClick={handleAddTeamMember} className="gap-2">
                
                Add Team Member
              </Button>
            </div>
          )}
        </div>
      )}

    </div>
  );
} 