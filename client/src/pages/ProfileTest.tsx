import { useState, useEffect } from "react";

export default function ProfileTest() {
  const [state, setState] = useState({
    loading: true,
    data: null,
    error: null
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const householdId = localStorage.getItem('dinner-decided-household-id');
        const response = await fetch('/api/household', {
          headers: {
            'X-Household-Id': householdId || 'unknown'
          }
        });
        
        if (!response.ok) {
          throw new Error(`${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        setState({ loading: false, data, error: null });
      } catch (error) {
        setState({ loading: false, data: null, error: String(error) });
      }
    };

    fetchData();
  }, []);

  return (
    <div className="p-4">
      <h1>Profile Test (Direct Fetch)</h1>
      <div className="bg-white p-4 rounded border">
        <p><strong>Loading:</strong> {state.loading ? "true" : "false"}</p>
        <p><strong>Error:</strong> {state.error || "none"}</p>
        <p><strong>Data:</strong> {state.data ? "exists" : "none"}</p>
        {state.data && (
          <pre className="mt-4 text-xs bg-gray-100 p-2 rounded overflow-auto">
            {JSON.stringify(state.data, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}