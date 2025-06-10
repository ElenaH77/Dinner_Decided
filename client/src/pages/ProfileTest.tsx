import { useQuery } from "@tanstack/react-query";

export default function ProfileTest() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/household'],
    retry: false,
  });

  return (
    <div className="p-4">
      <h1>Profile Test</h1>
      <div className="bg-white p-4 rounded border">
        <p><strong>Loading:</strong> {isLoading ? "true" : "false"}</p>
        <p><strong>Error:</strong> {error ? String(error) : "none"}</p>
        <p><strong>Data:</strong> {data ? "exists" : "none"}</p>
        {data && (
          <pre className="mt-4 text-xs bg-gray-100 p-2 rounded">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}