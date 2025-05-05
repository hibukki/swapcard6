import { useForm } from "@tanstack/react-form";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { z } from "zod";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

export const Route = createFileRoute("/send")({
  component: SendPage,
});

function SendPage() {
  const recipientsMap = useQuery(api.exchange.listRecipients) || {};
  const currentUser = useQuery(api.exchange.currentUser);

  // Convert the recipients map to an array for the dropdown
  const recipients = Object.entries(recipientsMap).map(([id, name]) => ({
    _id: id as Id<"users">,
    name,
  }));

  const sendClips = useMutation(api.exchange.sendClips);
  const [status, setStatus] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      to: "",
      amount: 0,
      note: "",
    },
    validators: {
      onChange: z.object({
        to: z.string().min(1, "Recipient is required"),
        amount: z.number().min(1, "Amount must be at least 1"),
        note: z.string(),
      }),
    },
    onSubmit: async ({ value }) => {
      try {
        await sendClips({
          toUserId: value.to as Id<"users">,
          amount: value.amount,
          note: value.note,
        });
        setStatus("Sent!");
        form.reset();
      } catch (err) {
        if (err instanceof Error) setStatus(err.message);
        else setStatus("Error");
      }
    },
  });

  return (
    <div className="max-w-md mx-auto space-y-4">
      <h2 className="text-2xl font-bold text-center">Send Clips</h2>
      {currentUser && (
        <p className="text-center">
          Your balance:{" "}
          <span className="font-semibold">{currentUser.balance}</span>
        </p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
        className="space-y-4"
      >
        <form.Field
          name="to"
          children={(field) => (
            <div>
              <label className="block mb-1 font-medium">Recipient</label>
              <select
                name={field.name}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                className="w-full border p-2 rounded"
              >
                <option value="" disabled>
                  Select recipient
                </option>
                {recipients.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.name}
                  </option>
                ))}
              </select>
              {!field.state.meta.isValid && (
                <div className="text-red-500 text-sm mt-1">
                  {field.state.meta.errors
                    .map((error) => error?.message)
                    .join(", ")}
                </div>
              )}
            </div>
          )}
        />

        <form.Field
          name="amount"
          children={(field) => (
            <div>
              <label className="block mb-1 font-medium">Amount</label>
              <input
                name={field.name}
                value={field.state.value || ""}
                onChange={(e) => field.handleChange(Number(e.target.value))}
                onBlur={field.handleBlur}
                type="number"
                min="1"
                className="w-full border p-2 rounded"
              />
              {!field.state.meta.isValid && (
                <div className="text-red-500 text-sm mt-1">
                  {field.state.meta.errors
                    .map((error) => error?.message)
                    .join(", ")}
                </div>
              )}
            </div>
          )}
        />

        <form.Field
          name="note"
          children={(field) => (
            <div>
              <label className="block mb-1 font-medium">Note</label>
              <input
                name={field.name}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                type="text"
                className="w-full border p-2 rounded"
              />
            </div>
          )}
        />

        <button
          type="submit"
          disabled={!form.state.canSubmit}
          className="w-full bg-blue-600 text-white py-2 rounded disabled:bg-blue-300"
        >
          Send
        </button>
      </form>
      {status && <p className="text-center mt-2">{status}</p>}
    </div>
  );
}
