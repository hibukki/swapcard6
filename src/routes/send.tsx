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
    <div className="max-w-md mx-auto">
      <div className="card">
        <div className="card-body">
          <h2 className="card-title justify-center">Send Clips</h2>
          {currentUser && (
            <div className="text-center mb-4">
              Your balance:{" "}
              <span className="badge badge-lg">{currentUser.balance}</span>
            </div>
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
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Recipient</span>
                  </label>
                  <select
                    name={field.name}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    className="select select-bordered w-full"
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
                    <label className="label">
                      <span className="label-text-alt text-error">
                        {field.state.meta.errors
                          .map((error) => error?.message)
                          .join(", ")}
                      </span>
                    </label>
                  )}
                </div>
              )}
            />

            <form.Field
              name="amount"
              children={(field) => (
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Amount</span>
                  </label>
                  <input
                    name={field.name}
                    value={field.state.value || ""}
                    onChange={(e) => field.handleChange(Number(e.target.value))}
                    onBlur={field.handleBlur}
                    type="number"
                    min="1"
                    className="input input-bordered w-full"
                  />
                  {!field.state.meta.isValid && (
                    <label className="label">
                      <span className="label-text-alt text-error">
                        {field.state.meta.errors
                          .map((error) => error?.message)
                          .join(", ")}
                      </span>
                    </label>
                  )}
                </div>
              )}
            />

            <form.Field
              name="note"
              children={(field) => (
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Note</span>
                  </label>
                  <input
                    name={field.name}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    type="text"
                    className="input input-bordered w-full"
                  />
                </div>
              )}
            />

            <div className="form-control mt-6">
              <button
                type="submit"
                disabled={!form.state.canSubmit}
                className="btn btn-primary w-full"
              >
                Send
              </button>
            </div>
          </form>
          {status && (
            <div
              className={`alert ${status === "Sent!" ? "alert-success" : "alert-error"} mt-4`}
            >
              <span>{status}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
