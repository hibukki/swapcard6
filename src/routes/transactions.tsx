import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/transactions")({
  component: TransactionsPage,
});

function TransactionsPage() {
  const transactions = useQuery(api.exchange.transactionsForCurrentUser) || [];
  const currentUser = useQuery(api.exchange.currentUser);
  const recipientMap = useQuery(api.exchange.listRecipients) || {};

  // Create complete userMap with current user as "You"
  const userMap = { ...(recipientMap || {}) };
  if (currentUser) {
    userMap[currentUser._id] = "You";
  }

  if (!transactions.length) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <h2 className="text-2xl font-bold text-center">Your Transactions</h2>
        <p className="text-center py-8">
          No transactions yet. Send some clips to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h2 className="text-2xl font-bold text-center">Your Transactions</h2>
      <table className="w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-2 py-1">Time</th>
            <th className="border px-2 py-1">Type</th>
            <th className="border px-2 py-1">With</th>
            <th className="border px-2 py-1">Amount</th>
            <th className="border px-2 py-1">Note</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => {
            const isOutgoing = currentUser && t.from === currentUser._id;
            const otherPartyId = isOutgoing ? t.to : t.from;
            const otherPartyName =
              userMap[otherPartyId as string] || "Unknown User";

            return (
              <tr key={t._id} className="text-center">
                <td className="border px-2 py-1">
                  {new Date(t._creationTime).toLocaleString()}
                </td>
                <td className="border px-2 py-1 font-medium">
                  {isOutgoing ? (
                    <span className="text-red-600">Sent</span>
                  ) : (
                    <span className="text-green-600">Received</span>
                  )}
                </td>
                <td className="border px-2 py-1">{otherPartyName}</td>
                <td className="border px-2 py-1 font-medium">
                  <span
                    className={isOutgoing ? "text-red-600" : "text-green-600"}
                  >
                    {isOutgoing ? "-" : "+"}
                    {t.amount}
                  </span>
                </td>
                <td className="border px-2 py-1">{t.note}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
