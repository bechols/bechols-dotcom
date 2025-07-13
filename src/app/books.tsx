import { BarChart3, BookOpen, Database, Eye, Heart } from "lucide-react";
import {
  Link,
  Outlet,
  createFileRoute,
  useLocation,
} from "@tanstack/react-router";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { LucideIcon } from "lucide-react";

export const Route = createFileRoute("/books")({
  component: BooksLayout,
});

interface BookTabLinkProps {
  value: string;
  to: string;
  icon: LucideIcon;
  fullText: string;
  shortText: string;
  activeTab: string;
  onClick?: () => void;
}

function BookTabLink({
  value,
  to,
  icon: Icon,
  fullText,
  shortText,
  activeTab,
  onClick,
}: BookTabLinkProps) {
  const isActive = activeTab === value;

  return (
    <TabsTrigger value={value} asChild>
      <Link
        to={to}
        className={`flex items-center gap-1.5 ${isActive ? "font-semibold bg-slate-100" : ""}`}
        onClick={onClick}
      >
        <Icon className="h-4 w-4" />
        <span className="hidden sm:inline">{fullText}</span>
        <span className="sm:hidden">{shortText}</span>
      </Link>
    </TabsTrigger>
  );
}

function BooksLayout() {
  const location = useLocation();

  // Determine active tab based on current route
  const getActiveTab = () => {
    const pathname = location.pathname;
    if (pathname === "/books" || pathname === "/books/")
      return "currently-reading";
    if (pathname === "/books/want-to-read") return "want-to-read";
    if (pathname === "/books/analytics") return "analytics";
    if (pathname === "/books/explore") return "explore";
    return "currently-reading";
  };

  const activeTab = getActiveTab();

  const handleTabChange = (value: string) => {
    if (value === "recently-read") {
      // Scroll to recently read section if on index page
      if (
        typeof window !== "undefined" &&
        (location.pathname === "/books" || location.pathname === "/books/")
      ) {
        const element = window.document.getElementById("recently-read-section");
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 md:px-8">
      <div className="pb-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-4">Books</h1>

        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-5">
            <BookTabLink
              value="currently-reading"
              to="/books"
              icon={Eye}
              fullText="Currently Reading"
              shortText="Current"
              activeTab={activeTab}
            />

            <BookTabLink
              value="recently-read"
              to="/books"
              icon={BookOpen}
              fullText="Recently Read"
              shortText="Recent"
              activeTab={activeTab}
              onClick={() => {
                if (
                  location.pathname === "/books" ||
                  location.pathname === "/books/"
                ) {
                  handleTabChange("recently-read");
                }
              }}
            />

            <BookTabLink
              value="want-to-read"
              to="/books/want-to-read"
              icon={Heart}
              fullText="Want to Read"
              shortText="Want"
              activeTab={activeTab}
            />

            <BookTabLink
              value="analytics"
              to="/books/analytics"
              icon={BarChart3}
              fullText="Analytics"
              shortText="Stats"
              activeTab={activeTab}
            />

            <BookTabLink
              value="explore"
              to="/books/explore"
              icon={Database}
              fullText="Explore"
              shortText="DB"
              activeTab={activeTab}
            />
          </TabsList>
        </Tabs>
      </div>

      <Outlet />
    </div>
  );
}
