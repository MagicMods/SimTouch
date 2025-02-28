import { exec } from "child_process";

console.log("Checking for active servers...");

// Check for processes listening on port 3001
exec("netstat -ano | findstr :3001", (err, stdout, stderr) => {
  if (err) {
    console.log("No processes found listening on port 3001");
    console.log("This means your UDP server is not running!");
    return;
  }

  console.log("Processes listening on port 3001:");
  console.log(stdout);
  console.log(
    "If you see processes listed above, your server appears to be running"
  );
});
