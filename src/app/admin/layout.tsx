import "./admin-dark.css";

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="kaka-admin-dark">{children}</div>;
}
