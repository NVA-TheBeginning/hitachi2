"use client";

import { formatDateLong } from "@api/helpers";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CarFrontIcon, Loader2, MailIcon, Trash2Icon, UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";

import Loader from "@/components/loader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { type client, orpc } from "@/utils/orpc";

type AccountData = Awaited<ReturnType<typeof client.getMyAccount>>;

const profileSchema = z.object({
  name: z.string().trim().min(2, "Le nom doit contenir au moins 2 caracteres."),
  email: z.email("Adresse email invalide."),
});

const carSchema = z.object({
  name: z.string().trim().min(2, "Le nom du vehicule doit contenir au moins 2 caracteres.").max(80),
  licensePlate: z
    .string()
    .trim()
    .min(2, "La plaque doit contenir au moins 2 caracteres.")
    .max(20, "La plaque ne peut pas depasser 20 caracteres."),
  electric: z.boolean(),
});

export default function AccountPageContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const accountQuery = useQuery(orpc.getMyAccount.queryOptions());

  if (accountQuery.isLoading) {
    return <Loader />;
  }

  if (accountQuery.isError || !accountQuery.data) {
    return (
      <Card>
        <CardHeader />
        <CardContent>
          <p className="text-destructive">Erreur lors du chargement du compte.</p>
        </CardContent>
      </Card>
    );
  }

  const refreshAccount = async () => {
    await queryClient.invalidateQueries({ queryKey: orpc.getMyAccount.key() });
    router.refresh();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <ProfileCard
        key={`${accountQuery.data.name}:${accountQuery.data.email}`}
        account={accountQuery.data}
        onRefresh={refreshAccount}
      />
      <CarsCard account={accountQuery.data} onRefresh={refreshAccount} />
    </div>
  );
}

function ProfileCard({ account, onRefresh }: { account: NonNullable<AccountData>; onRefresh: () => Promise<void> }) {
  const profileForm = useForm({
    defaultValues: {
      name: account.name,
      email: account.email,
    },
    validators: {
      onSubmit: profileSchema,
    },
    onSubmit: async ({ value }) => {
      const trimmedName = value.name.trim();
      const trimmedEmail = value.email.trim().toLowerCase();
      const errors: string[] = [];

      if (trimmedName !== account.name) {
        try {
          await authClient.updateUser({ name: trimmedName });
        } catch (e) {
          errors.push(e instanceof Error ? e.message : "Erreur lors de la mise a jour du nom.");
        }
      }

      if (trimmedEmail !== account.email) {
        try {
          await authClient.changeEmail({ newEmail: trimmedEmail });
        } catch (e) {
          errors.push(e instanceof Error ? e.message : "Erreur lors du changement d'email.");
        }
      }

      if (errors.length > 0) {
        toast.error(errors[0]);
        return;
      }

      await onRefresh();
      toast.success("Profil mis a jour.");
    },
  });

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle>Profil</CardTitle>
        <CardDescription>Met a jour tes informations personnelles.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            profileForm.handleSubmit();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="profile-role">Role</Label>
              <Input id="profile-role" value={account.role} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-member-since">Membre depuis</Label>
              <Input id="profile-member-since" value={formatDateLong(account.createdAt)} disabled />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="profile-reservation-count">Reservations actives</Label>
              <Input id="profile-reservation-count" value={account.reservationQuota.reservationCount} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-reservation-limit">Quota maximum</Label>
              <Input id="profile-reservation-limit" value={account.reservationQuota.maxReservations} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-reservation-remaining">Reservations restantes</Label>
              <Input
                id="profile-reservation-remaining"
                value={account.reservationQuota.remainingReservations}
                disabled
              />
            </div>
          </div>

          <profileForm.Field name="name">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Nom</Label>
                <div className="relative">
                  <UserIcon className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                  <Input
                    id={field.name}
                    name={field.name}
                    className="pl-9"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                  />
                </div>
                {field.state.meta.errors.map((error) => (
                  <p key={error?.message} className="text-sm text-destructive">
                    {error?.message}
                  </p>
                ))}
              </div>
            )}
          </profileForm.Field>

          <profileForm.Field name="email">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Email</Label>
                <div className="relative">
                  <MailIcon className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                  <Input
                    id={field.name}
                    name={field.name}
                    type="email"
                    className="pl-9"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                  />
                </div>
                {field.state.meta.errors.map((error) => (
                  <p key={error?.message} className="text-sm text-destructive">
                    {error?.message}
                  </p>
                ))}
              </div>
            )}
          </profileForm.Field>

          <profileForm.Subscribe>
            {(state) => (
              <Button type="submit" disabled={!state.canSubmit || state.isSubmitting}>
                {state.isSubmitting ? "Enregistrement..." : "Enregistrer le profil"}
              </Button>
            )}
          </profileForm.Subscribe>
        </form>
      </CardContent>
    </Card>
  );
}

function CarsCard({ account, onRefresh }: { account: NonNullable<AccountData>; onRefresh: () => Promise<void> }) {
  const queryClient = useQueryClient();
  const createCarMutation = useMutation(
    orpc.createMyCar.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: orpc.getMyAccount.key() });
        await onRefresh();
        toast.success("Voiture ajoutee.");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const createCarForm = useForm({
    defaultValues: {
      name: "",
      licensePlate: "",
      electric: false,
    },
    validators: {
      onSubmit: carSchema,
    },
    onSubmit: async ({ value, formApi }) => {
      await createCarMutation.mutateAsync(value);
      formApi.reset();
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Voitures liees</CardTitle>
          <CardDescription>Ajoute, modifie ou supprime les voitures associees a ton compte.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              event.stopPropagation();
              createCarForm.handleSubmit();
            }}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <createCarForm.Field name="name">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Nom du vehicule</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      placeholder="Voiture principale"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                    />
                    {field.state.meta.errors.map((error) => (
                      <p key={error?.message} className="text-sm text-destructive">
                        {error?.message}
                      </p>
                    ))}
                  </div>
                )}
              </createCarForm.Field>

              <createCarForm.Field name="licensePlate">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Plaque d'immatriculation</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      placeholder="AA-123-AA"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                    />
                    {field.state.meta.errors.map((error) => (
                      <p key={error?.message} className="text-sm text-destructive">
                        {error?.message}
                      </p>
                    ))}
                  </div>
                )}
              </createCarForm.Field>
            </div>

            <createCarForm.Field name="electric">
              {(field) => (
                <label className="flex items-center gap-3">
                  <Checkbox
                    checked={field.state.value}
                    onCheckedChange={(checked) => field.handleChange(Boolean(checked))}
                  />
                  <span className="text-sm">Vehicule electrique / hybride rechargeable</span>
                </label>
              )}
            </createCarForm.Field>

            <createCarForm.Subscribe>
              {(state) => (
                <Button type="submit" className="w-fit" disabled={!state.canSubmit || state.isSubmitting}>
                  {state.isSubmitting || createCarMutation.isPending ? "Ajout..." : "Ajouter une voiture"}
                </Button>
              )}
            </createCarForm.Subscribe>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {account.cars.length === 0 ? (
          <Card>
            <CardContent className="flex items-center gap-3 py-8">
              <CarFrontIcon className="text-muted-foreground size-5" />
              <p className="text-muted-foreground">Aucune voiture liee pour le moment.</p>
            </CardContent>
          </Card>
        ) : (
          account.cars.map((car) => (
            <CarItem
              key={`${car.id}:${car.name}:${car.licensePlate ?? "missing"}:${car.electric}:${car.reservationCount}`}
              car={car}
              onRefresh={onRefresh}
            />
          ))
        )}
      </div>
    </div>
  );
}

function CarItem({
  car,
  onRefresh,
}: {
  car: NonNullable<AccountData>["cars"][number];
  onRefresh: () => Promise<void>;
}) {
  const updateMutation = useMutation(
    orpc.updateMyCar.mutationOptions({
      onSuccess: async () => {
        await onRefresh();
        toast.success("Voiture mise a jour.");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const deleteMutation = useMutation(
    orpc.deleteMyCar.mutationOptions({
      onSuccess: async () => {
        await onRefresh();
        toast.success("Voiture supprimee.");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const carForm = useForm({
    defaultValues: {
      name: car.name,
      licensePlate: car.licensePlate ?? "",
      electric: car.electric,
    },
    validators: {
      onSubmit: carSchema,
    },
    onSubmit: async ({ value }) => {
      await updateMutation.mutateAsync({
        carId: car.id,
        ...value,
      });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{car.name}</CardTitle>
        <CardDescription>
          {car.reservationCount > 0
            ? `${car.reservationCount} reservation(s) liee(s), suppression verrouillee.`
            : "Aucune reservation liee."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            carForm.handleSubmit();
          }}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <carForm.Field name="name">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={`${car.id}-${field.name}`}>Nom du vehicule</Label>
                  <Input
                    id={`${car.id}-${field.name}`}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                  />
                  {field.state.meta.errors.map((error) => (
                    <p key={error?.message} className="text-sm text-destructive">
                      {error?.message}
                    </p>
                  ))}
                </div>
              )}
            </carForm.Field>

            <carForm.Field name="licensePlate">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={`${car.id}-${field.name}`}>Plaque</Label>
                  <Input
                    id={`${car.id}-${field.name}`}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                  />
                  {field.state.meta.errors.map((error) => (
                    <p key={error?.message} className="text-sm text-destructive">
                      {error?.message}
                    </p>
                  ))}
                </div>
              )}
            </carForm.Field>
          </div>

          <carForm.Field name="electric">
            {(field) => (
              <label className="flex items-center gap-3">
                <Checkbox
                  checked={field.state.value}
                  onCheckedChange={(checked) => field.handleChange(Boolean(checked))}
                />
                <span className="text-sm">Vehicule electrique / hybride rechargeable</span>
              </label>
            )}
          </carForm.Field>

          <div className="flex flex-wrap gap-3">
            <carForm.Subscribe>
              {(state) => (
                <Button type="submit" disabled={!state.canSubmit || state.isSubmitting || updateMutation.isPending}>
                  {state.isSubmitting || updateMutation.isPending ? "Mise a jour..." : "Mettre a jour"}
                </Button>
              )}
            </carForm.Subscribe>

            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending || car.reservationCount > 0}
              onClick={() => deleteMutation.mutate({ carId: car.id })}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <Trash2Icon className="size-4" />
                  Supprimer
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
