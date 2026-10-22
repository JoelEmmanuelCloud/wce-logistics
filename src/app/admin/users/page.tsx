import type { Metadata } from "next";
import { setUserStatusAction } from "@/app/admin/actions";
import { DataTable, FilterTabs, Pagination, SearchForm } from "@/components/admin/list-controls";
import { PageHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate, formatDateTime } from "@/lib/labels";
import { formatPhone } from "@/lib/phone";
import { listUsersForAdmin, parsePage, parseQuery } from "@/server/admin";
import { requireRole } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Users" };

const ROLE_FILTERS = {
  all: { label: "All" },
  customer: { label: "Shippers" },
  vendor: { label: "Vendors" },
  admin: { label: "Admins" },
} as const;

const USER_STATUS = {
  active: { label: "Active", tone: "success" as const },
  suspended: { label: "Suspended", tone: "danger" as const },
};

const ROLE_LABELS: Record<string, string> = { customer: "Shipper", vendor: "Vendor", admin: "Admin", driver: "Driver" };

export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  const admin = await requireRole("admin");
  const params = await searchParams;
  const role = (typeof params.status === "string" && params.status in ROLE_FILTERS ? params.status : "all") as keyof typeof ROLE_FILTERS;
  const query = parseQuery(params.q);
  const page = parsePage(params.page);
  const result = await listUsersForAdmin({ role, query, page });

  return (
    <>
      <PageHeader title="Users" description="Suspending a user signs them out everywhere and blocks future sign-ins." />
      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <FilterTabs base="/admin/users" filters={ROLE_FILTERS} active={role} query={query} />
        <SearchForm base="/admin/users" status={role} query={query} placeholder="Name, email or phone" />
      </div>
      <DataTable caption="Users" headers={["Name", "Phone", "Role", "Joined", "Last sign-in", "Status", ""]}>
        {result.rows.length === 0 ? (
          <tr>
            <td colSpan={7} className="px-4 py-10 text-center text-navy/70">
              No users match this view.
            </td>
          </tr>
        ) : (
          result.rows.map((user) => (
            <tr key={user.id} className="hover:bg-navy/[0.02]">
              <td className="px-4 py-3">
                <span className="font-semibold text-navy">{user.fullName ?? "Not set"}</span>
                {user.email && <span className="block text-[13px] text-navy/70">{user.email}</span>}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-navy/80">{formatPhone(user.phone)}</td>
              <td className="px-4 py-3 text-navy/80">{user.role ? ROLE_LABELS[user.role] : "Onboarding"}</td>
              <td className="px-4 py-3 whitespace-nowrap text-navy/80">{formatDate(user.createdAt)}</td>
              <td className="px-4 py-3 whitespace-nowrap text-navy/80">{user.lastSignInAt ? formatDateTime(user.lastSignInAt) : "Never"}</td>
              <td className="px-4 py-3">
                <StatusBadge status={user.status} map={USER_STATUS} />
              </td>
              <td className="px-4 py-3 text-right">
                {user.id !== admin.id && (
                  <form action={setUserStatusAction}>
                    <input type="hidden" name="userId" value={user.id} />
                    <input type="hidden" name="status" value={user.status === "active" ? "suspended" : "active"} />
                    <button
                      type="submit"
                      className={`text-[13px] font-semibold underline underline-offset-4 ${user.status === "active" ? "text-[#912018]" : "text-navy"}`}
                    >
                      {user.status === "active" ? "Suspend" : "Reactivate"}
                      <span className="sr-only"> {user.fullName ?? user.email}</span>
                    </button>
                  </form>
                )}
              </td>
            </tr>
          ))
        )}
      </DataTable>
      <Pagination base="/admin/users" page={result.page} pageCount={result.pageCount} total={result.total} params={{ status: role, q: query }} />
    </>
  );
}
