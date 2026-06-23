# web/ — splat viewer + seat-POV

The production web viewer lives in **[`../../portal-fe`](../../portal-fe)** (Next.js, static-export,
three.js + `@mkkellogg/gaussian-splats-3d`). It streams a scene's **`.ksplat`** from object storage
and renders it in the browser — no plugin, no app.

This folder is the place for the **seat-POV product layer** that sits on top of the viewer.

## Seat-POV

- Fetch `GET /scenes/{id}` → `outputs.ksplat_url` + `seats`.
- Render the splat from the `.ksplat` URL.
- Seat picker: on select, disable free orbit and **tween the camera to the seat preset**
  (`position`, `target`, `fov`) — `lerp` position, `lookAt` the target.
- Author `seats.json` once per venue: open the splat, fly to each seat, read off the camera
  transform, `PUT /scenes/{id}/seats`. (A `?debug` capture mode in `portal-fe` prints the exact
  camera coords to paste.)

See [`../../portal-fe/README.md`](../../portal-fe/README.md) for the viewer, build, and deploy details.
