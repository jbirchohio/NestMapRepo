export default function TestComponent() {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#f0f0f0',
      zIndex: 9999,
      fontSize: '24px',
      fontWeight: 'bold',
    }}>
      <div style={{ padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <h1>Test Component Loaded!</h1>
        <p>If you can see this, React is working correctly.</p>
      </div>
    </div>
  );
}
