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
      <div className="max-w-2xl mx-auto">
        <div className="card">
          <div className="card-body">
            <h2 className="card-title justify-center">Your Transactions</h2>
            <p className="text-center py-8">
              No transactions yet. Send some clips to get started!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card">
        <div className="card-body">
          <h2 className="card-title justify-center">Your Transactions</h2>
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Type</th>
                  <th>With</th>
                  <th>Amount</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => {
                  const isOutgoing = currentUser && t.from === currentUser._id;
                  const otherPartyId = isOutgoing ? t.to : t.from;
                  const otherPartyName =
                    userMap[otherPartyId as string] || "Unknown User";

                  return (
                    <tr key={t._id}>
                      <td>{new Date(t._creationTime).toLocaleString()}</td>
                      <td className="font-medium">
                        {isOutgoing ? (
                          <span className="text-error">Sent</span>
                        ) : (
                          <span className="text-success">Received</span>
                        )}
                      </td>
                      <td>{otherPartyName}</td>
                      <td className="font-medium">
                        <span
                          className={isOutgoing ? "text-error" : "text-success"}
                        >
                          {isOutgoing ? "-" : "+"}
                          {t.amount}
                        </span>
                      </td>
                      <td>{t.note}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
