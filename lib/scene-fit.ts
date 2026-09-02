import { Box3, Object3D, Vector3 } from 'three'

/**
 * Moves an object so its bounding box is centred on X/Z and its base rests on
 * y = 0, which is where the floor plane and contact shadows live.
 *
 * The position is reset first so the function measures the object's intrinsic
 * bounds rather than accumulating offsets — that is what makes it idempotent.
 */
export function groundAndCenter(object: Object3D): void {
  object.position.set(0, 0, 0)
  object.updateWorldMatrix(true, true)

  const box = new Box3().setFromObject(object)
  if (box.isEmpty()) return

  const center = box.getCenter(new Vector3())
  object.position.set(-center.x, -box.min.y, -center.z)
  object.updateWorldMatrix(true, true)
}
