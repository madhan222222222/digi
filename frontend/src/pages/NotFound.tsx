import { Link } from "react-router-dom";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">404</p>
      <h1 className="mt-2 font-heading text-3xl font-extrabold tracking-tight text-slate-900">Page not found</h1>
      <p className="mt-2 max-w-md text-sm text-slate-600">
        The page you are looking for does not exist or has moved.
      </p>
      <Link to="/" className={buttonVariants({ className: "mt-6" })} data-testid="notfound-home-btn">
        Back to home
      </Link>
    </div>
  );
}
