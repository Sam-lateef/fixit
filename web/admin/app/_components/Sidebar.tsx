import Link from "next/link";

export function Sidebar(): JSX.Element {
  return (
    <aside className="w-56 bg-white border-r border-gray-200 min-h-screen p-4 flex flex-col">
      <div className="text-lg font-bold mb-6 text-gray-800">FixIt Admin</div>
      <nav className="flex flex-col gap-1 text-sm">
        <Link href="/users" className="px-3 py-2 rounded hover:bg-gray-100">
          Users
        </Link>
        <Link href="/posts" className="px-3 py-2 rounded hover:bg-gray-100">
          Posts
        </Link>
        <Link href="/reports" className="px-3 py-2 rounded hover:bg-gray-100">
          Reports
        </Link>
        <Link href="/chat/threads" className="px-3 py-2 rounded hover:bg-gray-100">
          Chat
        </Link>
        <Link href="/media" className="px-3 py-2 rounded hover:bg-gray-100">
          Media
        </Link>
        <Link href="/audit" className="px-3 py-2 rounded hover:bg-gray-100">
          Audit
        </Link>
      </nav>
      <form action="/api/logout" method="POST" className="mt-auto">
        <button
          type="submit"
          className="w-full text-left px-3 py-2 rounded text-red-600 hover:bg-red-50 text-sm"
        >
          Sign out
        </button>
      </form>
    </aside>
  );
}
