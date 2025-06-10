export default function DebugProfile() {
  console.log('DebugProfile component is rendering');
  
  // Add some debugging
  const currentPath = window.location.pathname;
  const currentTime = new Date().toISOString();
  
  console.log('Current path:', currentPath);
  console.log('Current time:', currentTime);
  
  return (
    <div style={{ 
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
      padding: '20px', 
      backgroundColor: 'red', 
      color: 'white',
      fontSize: '24px',
      overflow: 'auto'
    }}>
      <h1>DEBUG PROFILE PAGE - FIXED POSITION</h1>
      <p>Path: {currentPath}</p>
      <p>Time: {currentTime}</p>
      <p>If you see this, the component is rendering!</p>
      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: 'blue' }}>
        <p>This should be visible with bright colors</p>
        <p>z-index: 9999 - should be on top of everything</p>
      </div>
      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: 'green' }}>
        <p>TESTING OVERLAY COVERAGE</p>
        <p>Fixed position with highest z-index</p>
      </div>
    </div>
  );
}