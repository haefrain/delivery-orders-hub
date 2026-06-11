# Recording the demo GIF

The README links `docs/demo.gif`. To record it:

1. Start everything and open the board:

   ```bash
   docker compose up -d --build
   open http://localhost:8080
   ```

2. Start a screen recording of the browser window (macOS: `Cmd+Shift+5`, record selected portion).

3. Generate ~30 seconds of traffic:

   ```bash
   pnpm --filter @delivery-hub/api simulate -- --count 25 --rate 1.5
   ```

   Orders will land in **Received** and advance across columns live. Click a couple of action buttons yourself for the operator touch.

4. Stop the recording and convert to an optimized GIF (`brew install ffmpeg gifski`):

   ```bash
   ffmpeg -i demo.mov -vf "fps=12,scale=960:-1" -f yuv4mpegpipe - | gifski -o docs/demo.gif --fps 12 --quality 80 -
   ```

5. Swap the "Demo GIF coming soon" line in both READMEs for:

   ```markdown
   ![Live kanban demo](docs/demo.gif)
   ```
