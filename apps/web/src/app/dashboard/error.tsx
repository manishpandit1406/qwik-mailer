"use client";
export default function ErrorBoundary({ error }: { error: Error }) {
  return (
    <div className="p-10 text-red-500">
      {" "}
      <h1 className="text-2xl font-bold">Something went wrong!</h1>{" "}
      <pre className="mt-4 p-4 bg-black/10 rounded">{error.message}</pre>{" "}
      <pre className="mt-4 p-4 bg-black/10 rounded text-xs">
        {error.stack}
      </pre>{" "}
    </div>
  );
}
