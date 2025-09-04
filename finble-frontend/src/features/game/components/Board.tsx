export function Board() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      {/* 가로 10, 세로 10 크기의 평면 */}
      <planeGeometry args={[10, 10]} />
      {/* 회색 재질 */}
      <meshStandardMaterial color="grey" />
    </mesh>
  )
}