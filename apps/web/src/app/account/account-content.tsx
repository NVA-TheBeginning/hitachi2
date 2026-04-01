"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import Loader from "@/components/loader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { orpc, queryClient } from "@/utils/orpc";

type AccountCar = {
  id: string;
  name: string;
  licensePlate: string;
  electric: boolean;
};

type Account = {
  id: string;
  name: string;
  email: string;
  role: string;
  cars: AccountCar[];
};

function AccountProfileEditor({
  account,
  isSaving,
  onSave,
}: {
  account: Account;
  isSaving: boolean;
  onSave: (input: { name: string }) => void;
}) {
  const [profileName, setProfileName] = useState(account.name);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mon compte</CardTitle>
        <CardDescription>Modifiez votre nom et consultez les informations de votre session.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="account-name">Nom</Label>
          <Input id="account-name" value={profileName} onChange={(event) => setProfileName(event.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="account-role">Role</Label>
          <Input id="account-role" value={account.role} readOnly />
        </div>

        <div className="space-y-2 md:col-span-3">
          <Label htmlFor="account-email">Email</Label>
          <Input id="account-email" value={account.email} readOnly />
        </div>
      </CardContent>
      <CardFooter className="justify-end">
        <Button
          onClick={() =>
            onSave({
              name: profileName,
            })
          }
          disabled={isSaving || profileName.trim().length < 2 || profileName === account.name}
        >
          {isSaving ? "Enregistrement..." : "Mettre a jour"}
        </Button>
      </CardFooter>
    </Card>
  );
}

function CarEditor({
  car,
  onSave,
  onDelete,
  isSaving,
  isDeleting,
}: {
  car: AccountCar;
  onSave: (input: { carId: string; name: string; licensePlate: string; electric: boolean }) => void;
  onDelete: (carId: string) => void;
  isSaving: boolean;
  isDeleting: boolean;
}) {
  const [name, setName] = useState(car.name);
  const [licensePlate, setLicensePlate] = useState(car.licensePlate);
  const [electric, setElectric] = useState(car.electric);

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{car.name}</CardTitle>
        <CardDescription>Modifiez les informations de cette voiture.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`car-name-${car.id}`}>Nom</Label>
          <Input id={`car-name-${car.id}`} value={name} onChange={(event) => setName(event.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`car-plate-${car.id}`}>Immatriculation</Label>
          <Input
            id={`car-plate-${car.id}`}
            value={licensePlate}
            onChange={(event) => setLicensePlate(event.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 md:col-span-2">
          <Checkbox
            id={`car-electric-${car.id}`}
            checked={electric}
            onCheckedChange={(checked) => setElectric(checked === true)}
          />
          <Label htmlFor={`car-electric-${car.id}`}>Vehicule electrique</Label>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between gap-2">
        <Button variant="destructive" onClick={() => onDelete(car.id)} disabled={isDeleting || isSaving}>
          {isDeleting ? "Suppression..." : "Supprimer"}
        </Button>

        <Button
          onClick={() =>
            onSave({
              carId: car.id,
              name,
              licensePlate,
              electric,
            })
          }
          disabled={isSaving || isDeleting || name.trim().length < 2 || licensePlate.trim().length < 2}
        >
          {isSaving ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function AccountContent() {
  const accountQuery = useQuery(orpc.getMyAccount.queryOptions());
  const [newCarName, setNewCarName] = useState("");
  const [newCarLicensePlate, setNewCarLicensePlate] = useState("");
  const [newCarElectric, setNewCarElectric] = useState(false);

  const refreshAccount = async () => {
    await queryClient.invalidateQueries();
  };

  const updateAccountMutation = useMutation(
    orpc.updateMyAccount.mutationOptions({
      onSuccess: async () => {
        toast.success("Compte mis a jour.");
        await refreshAccount();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const createCarMutation = useMutation(
    orpc.createMyCar.mutationOptions({
      onSuccess: async () => {
        toast.success("Voiture ajoutee.");
        setNewCarName("");
        setNewCarLicensePlate("");
        setNewCarElectric(false);
        await refreshAccount();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const updateCarMutation = useMutation(
    orpc.updateMyCar.mutationOptions({
      onSuccess: async () => {
        toast.success("Voiture mise a jour.");
        await refreshAccount();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const deleteCarMutation = useMutation(
    orpc.deleteMyCar.mutationOptions({
      onSuccess: async () => {
        toast.success("Voiture supprimee.");
        await refreshAccount();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  if (accountQuery.isPending) {
    return <Loader />;
  }

  if (accountQuery.isError || !accountQuery.data) {
    return (
      <div className="rounded-lg border border-destructive/30 p-4 text-sm text-destructive">
        {accountQuery.error?.message ?? "Impossible de charger votre compte."}
      </div>
    );
  }

  const account = accountQuery.data as Account;

  return (
    <div className="grid gap-6">
      <AccountProfileEditor
        key={`${account.id}:${account.name}`}
        account={account}
        isSaving={updateAccountMutation.isPending}
        onSave={(input) => updateAccountMutation.mutate(input)}
      />

      <Card>
        <CardHeader>
          <CardTitle>Mes voitures</CardTitle>
          <CardDescription>Ajoutez, modifiez ou supprimez les voitures rattachees a votre compte.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 rounded-none border p-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new-car-name">Nom</Label>
              <Input
                id="new-car-name"
                value={newCarName}
                onChange={(event) => setNewCarName(event.target.value)}
                placeholder="Ex: Tesla Model 3"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-car-plate">Immatriculation</Label>
              <Input
                id="new-car-plate"
                value={newCarLicensePlate}
                onChange={(event) => setNewCarLicensePlate(event.target.value)}
                placeholder="Ex: AB-123-CD"
              />
            </div>

            <div className="flex items-center gap-2 md:col-span-2">
              <Checkbox
                id="new-car-electric"
                checked={newCarElectric}
                onCheckedChange={(checked) => setNewCarElectric(checked === true)}
              />
              <Label htmlFor="new-car-electric">Vehicule electrique</Label>
            </div>

            <div className="md:col-span-2 flex justify-end">
              <Button
                onClick={() =>
                  createCarMutation.mutate({
                    name: newCarName,
                    licensePlate: newCarLicensePlate,
                    electric: newCarElectric,
                  })
                }
                disabled={
                  createCarMutation.isPending || newCarName.trim().length < 2 || newCarLicensePlate.trim().length < 2
                }
              >
                {createCarMutation.isPending ? "Ajout..." : "Ajouter la voiture"}
              </Button>
            </div>
          </div>

          {account.cars.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {account.cars.map((car) => (
                <CarEditor
                  key={`${car.id}:${car.name}:${car.licensePlate}:${car.electric}`}
                  car={car}
                  onSave={(input) => updateCarMutation.mutate(input)}
                  onDelete={(carId) => deleteCarMutation.mutate({ carId })}
                  isSaving={updateCarMutation.isPending && updateCarMutation.variables?.carId === car.id}
                  isDeleting={deleteCarMutation.isPending && deleteCarMutation.variables?.carId === car.id}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucune voiture enregistree pour le moment.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
