declare module 'vanta/dist/vanta.fog.min' {
  const fog: (options: Record<string, unknown>) => { destroy: () => void };
  export default fog;
}
