'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api-client';
import { GrantProResponse } from '@/lib/contracts/grant-pro';
import { applyServerErrors } from '@/lib/forms';

// Form tracks `email` + optional `expiresAt`; `action` is chosen by which
// button the admin click. Mirrors the GrantProRequest contract for the two
// overlapping fields.
const FormSchema = z.object({
  email: z.string().email('Enter a valid email'),
  expiresAt: z.string().optional(),
});
type FormValues = z.infer<typeof FormSchema>;

type Action = 'grant' | 'revoke';

export function GrantProForm() {
  const [busyAction, setBusyAction] = useState<Action | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: { email: '', expiresAt: '' },
  });

  const submit = (action: Action) =>
    form.handleSubmit(async (values) => {
      setBusyAction(action);
      try {
        const expiresAtIso =
          values.expiresAt && values.expiresAt.length > 0
            ? new Date(values.expiresAt).toISOString()
            : undefined;
        const body = {
          action,
          email: values.email,
          ...(expiresAtIso ? { expiresAt: expiresAtIso } : {}),
        };
        const result = await apiFetch('/api/admin/grant-pro', {
          method: 'POST',
          body: JSON.stringify(body),
          schema: GrantProResponse,
        });
        toast.success(`${action === 'grant' ? 'Granted' : 'Revoked'} Pro for ${result.email}`);
      } catch (err) {
        const cause = err instanceof Error ? (err as { cause?: unknown }).cause : undefined;
        if (!cause || !applyServerErrors(cause, form.setError)) {
          toast.error('Something went wrong. Please try again.');
        }
      } finally {
        setBusyAction(null);
      }
    });

  return (
    <Form {...form}>
      <form className="flex flex-col gap-6" onSubmit={(e) => e.preventDefault()}>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="recipient@example.com"
                  autoComplete="off"
                  {...field}
                  onChange={(e) => {
                    field.onChange(e);
                    form.clearErrors('email');
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="expiresAt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Expires at{' '}
                <span className="text-muted-foreground font-normal">(optional, grant only)</span>
              </FormLabel>
              <FormControl>
                <Input
                  type="datetime-local"
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-wrap gap-3">
          <Button type="button" disabled={busyAction !== null} onClick={submit('grant')}>
            {busyAction === 'grant' ? 'Granting…' : 'Grant Pro'}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busyAction !== null}
            onClick={submit('revoke')}
          >
            {busyAction === 'revoke' ? 'Revoking…' : 'Revoke'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
