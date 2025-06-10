export default function StaticProfile() {
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Static Profile Test</h1>
      <p>This is a completely static component with no React hooks, no API calls, no context providers.</p>
      <div style={{ border: '1px solid #ccc', padding: '16px', marginTop: '16px' }}>
        <h2>Profile Information</h2>
        <p><strong>Name:</strong> Test User</p>
        <p><strong>Household:</strong> Test Household</p>
        <p><strong>Status:</strong> Static content loading successfully</p>
      </div>
    </div>
  );
}