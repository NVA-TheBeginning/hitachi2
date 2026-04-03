"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { UserRole } from "@/lib/enum";
import { orpc, queryClient } from "@/utils/orpc";

function UserRowActions({ user }: { user: { id: string; name: string; role: UserRole } }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState(user.role);

  const updateMutation = useMutation(
    orpc.updateUser.mutationOptions({
      onSuccess: async () => {
        toast.success("Utilisateur mis a jour.");
        setOpen(false);
        await queryClient.invalidateQueries({ queryKey: orpc.getAllUsers.key() });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const deleteMutation = useMutation(
    orpc.deleteUser.mutationOptions({
      onSuccess: async () => {
        toast.success("Utilisateur supprime.");
        await queryClient.invalidateQueries({ queryKey: orpc.getAllUsers.key() });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({ userId: user.id, name, role });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button size="sm" variant="outline">
          Modifier
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier l&apos;utilisateur</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom" />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full h-10 rounded-md border px-3 text-sm"
            >
              <option value={UserRole.EMPLOYEE}>Employe</option>
              <option value={UserRole.SECRETARY}>Secretaire</option>
              <option value={UserRole.MANAGER}>Manager</option>
            </select>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (confirm("Etes-vous sur de vouloir supprimer cet utilisateur?")) {
                  deleteMutation.mutate({ userId: user.id });
                  setOpen(false);
                }
              }}
              disabled={deleteMutation.isPending}
            >
              Supprimer
            </Button>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                Sauvegarder
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function UsersTable() {
  const [search, setSearch] = useState("");
  const query = useQuery(orpc.getAllUsers.queryOptions());

  const users = query.data ?? [];
  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(search.toLowerCase()) || user.email.toLowerCase().includes(search.toLowerCase()),
  );

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case UserRole.MANAGER:
        return "Manager";
      case UserRole.SECRETARY:
        return "Secretaire";
      default:
        return "Employe";
    }
  };

  return (
    <div className="space-y-4">
      <Input
        placeholder="Rechercher par nom ou email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full sm:max-w-xs"
      />

      {query.isPending && <p className="text-muted-foreground">Chargement...</p>}
      {query.isError && <p className="text-destructive">Erreur: {query.error.message}</p>}

      {query.isSuccess && (
        <>
          <div className="space-y-3 md:hidden">
            {filteredUsers.length === 0 ? (
              <div className="rounded-md border px-4 py-8 text-center text-muted-foreground">
                Aucun utilisateur trouve.
              </div>
            ) : (
              filteredUsers.map((user) => (
                <div key={user.id} className="space-y-3 rounded-md border p-4">
                  <div className="space-y-1">
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm break-words text-muted-foreground">{user.email}</p>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="inline-flex rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                      {getRoleLabel(user.role)}
                    </span>
                    <span className="text-muted-foreground">
                      {user.carCount} voiture(s) · {user.reservationCount} reservation(s)
                    </span>
                  </div>
                  <UserRowActions user={user} />
                </div>
              ))
            )}
          </div>
          <div className="hidden rounded-md border md:block">
            <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2 text-left text-sm font-medium">Nom</th>
                <th className="px-4 py-2 text-left text-sm font-medium">Email</th>
                <th className="px-4 py-2 text-left text-sm font-medium">Role</th>
                <th className="px-4 py-2 text-left text-sm font-medium">Voitures</th>
                <th className="px-4 py-2 text-left text-sm font-medium">Reservations</th>
                <th className="px-4 py-2 text-left text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Aucun utilisateur trouve.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b">
                    <td className="px-4 py-2">{user.name}</td>
                    <td className="px-4 py-2 text-muted-foreground">{user.email}</td>
                    <td className="px-4 py-2">
                      <span className="inline-flex rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                    <td className="px-4 py-2">{user.carCount}</td>
                    <td className="px-4 py-2">{user.reservationCount}</td>
                    <td className="px-4 py-2">
                      <UserRowActions user={user} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </>
      )}
    </div>
  );
}
