export default function DebugProfile() {
  console.log('DebugProfile component is rendering');
  
  // Add some debugging
  const currentPath = window.location.pathname;
  const currentTime = new Date().toISOString();
  
  console.log('Current path:', currentPath);
  console.log('Current time:', currentTime);
  
  return (
    <div style={{ 
      padding: '20px', 
      backgroundColor: 'red', 
      color: 'white',
      minHeight: '100vh',
      fontSize: '24px'
    }}>
      <h1>DEBUG PROFILE PAGE</h1>
      <p>Path: {currentPath}</p>
      <p>Time: {currentTime}</p>
      <p>If you see this, the component is rendering!</p>
      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: 'blue' }}>
        <p>This should be visible with bright colors</p>
      </div>
    </div>
  );
}