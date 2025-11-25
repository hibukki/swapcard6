# Backend

Ideally we will have only a few backend functions, each is simple and reviewable (for security), and if the frontend needs anything more complicated, the frontend can call several such functions.

The classic solution would be CRUD per schema-table, for example users.ts to interact with the users table.

What if, for example, the function for returning a Meeting needs to read the Users? That's ok, but it should (a) use users.ts to read the users table (which will handle auth/security for users), and (b) only return Meetings, not Users. (again, if the frontend wants both, it can call more than one function and keep the backend simple).

What if there's circular dependency? It's ok to make usersUtils.ts if needed.

What if something is made wrong? Consider telling the user using a red X emoji to indicate a problem.
