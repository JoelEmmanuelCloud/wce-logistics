import { TableSkeleton } from "@/components/app/page-skeleton";

export default function Loading() {
  return <TableSkeleton columns={5} filters={false} />;
}
