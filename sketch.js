let walls = [];
let particle;

let wallCount = 4; // Number of walls
let rayCount = 1; // Increment angle for rays
let ellipseImages = [];
let currentImageIndex = 0;
let nextImageIndex = 1;
let transitionProgress = 0; // Progress of the transition between images
let transitionSpeed = 0.01; // Speed of the transition
let ellipseCenter;
let ellipseRadius = 200; // Radius of the image "hover area"

// Noise variables for particle movement
let noiseOffsetX = 0;
let noiseOffsetY = 1000;

// Image effect variables
let imageOpacity = 0.6; // Initial opacity
let imageRotation = 0; // Initial rotation angle

// Music variables
let music;
let isMusicPlaying = false;

function preload() {
  // Load all the images
  for (let i = 1; i <= 7; i++) {
    ellipseImages.push(loadImage(`png${i}.png`));
  }

  // Load the music
  music = loadSound("romantic.mp3");
}

function setup() {
  createCanvas(windowWidth, windowHeight);

  // Define ellipse center
  ellipseCenter = createVector(width / 2, height / 2);

  // Create walls ensuring they are outside the ellipse
  for (let i = 0; i < wallCount; i++) {
    let x1, y1, x2, y2;
    do {
      x1 = random(width);
      y1 = random(height);
      x2 = random(width);
      y2 = random(height);
    } while (isLineInsideEllipse(x1, y1, x2, y2)); // Ensure walls are outside the ellipse
    walls[i] = new Boundary(x1, y1, x2, y2);
  }

  // Add canvas boundaries as walls
  walls.push(new Boundary(-1, -1, width, -1));
  walls.push(new Boundary(width, -1, width, height));
  walls.push(new Boundary(width, height, -1, height));
  walls.push(new Boundary(-1, height, -1, -1));

  // Create the particle
  particle = new Particle();

  noCursor();
}

function draw() {
  background(0);

  // Check if the cursor is inside the image bounds
  let distanceFromCenter = dist(mouseX, mouseY, ellipseCenter.x, ellipseCenter.y);
  if (distanceFromCenter < ellipseRadius) {
    imageOpacity = lerp(imageOpacity, 1, 0.1); // Gradually increase opacity to 100%
    imageRotation += radians(0.5); // Rotate the image

    // Increment transition progress
    transitionProgress += transitionSpeed;
    if (transitionProgress >= 1) {
      // Move to the next image when transition is complete
      currentImageIndex = nextImageIndex;
      nextImageIndex = (nextImageIndex + 1) % ellipseImages.length;
      transitionProgress = 0;
    }

    // Play music if not already playing
    if (!isMusicPlaying) {
      music.loop(); // Start looping music
      isMusicPlaying = true;
    }
  } else {
    imageOpacity = lerp(imageOpacity, 0.2, 0.1); // Gradually decrease opacity to 20%
    transitionProgress = 0; // Stop transition when not hovering

    // Stop music if it's playing
    if (isMusicPlaying) {
      music.stop();
      isMusicPlaying = false;
    }
  }

  // Draw the images with transition effect
  push();
  translate(ellipseCenter.x, ellipseCenter.y);
  rotate(imageRotation); // Apply rotation
  imageMode(CENTER);

  // Current image
  tint(255, 255 * (1 - transitionProgress) * imageOpacity); // Adjust opacity for current image
  let scaledWidth = ellipseImages[currentImageIndex].width / 2;
  let scaledHeight = ellipseImages[currentImageIndex].height / 2;
  image(ellipseImages[currentImageIndex], 0, 0, scaledWidth, scaledHeight);

  // Next image
  tint(255, 255 * transitionProgress * imageOpacity); // Adjust opacity for next image
  image(ellipseImages[nextImageIndex], 0, 0, scaledWidth, scaledHeight);
  pop();

  // Show walls and cast rays if cursor is inside the image bounds
  if (distanceFromCenter < ellipseRadius) {
    for (let wall of walls) {
      wall.show();
    }
    particle.update(mouseX, mouseY);
    particle.show();
    particle.look(walls);
  }

  // Draw the custom cursor (star shape)
  drawStar(mouseX, mouseY, 10, 15, 5);
}

// Function to draw a custom star cursor
function drawStar(x, y, radius1, radius2, npoints) {
  let angle = TWO_PI / npoints;
  let halfAngle = angle / 2.0;
  beginShape();
  for (let a = -PI / 2; a < TWO_PI - PI / 2; a += angle) {
    let sx = x + cos(a) * radius2;
    let sy = y + sin(a) * radius2;
    vertex(sx, sy);
    sx = x + cos(a + halfAngle) * radius1;
    sy = y + sin(a + halfAngle) * radius1;
    vertex(sx, sy);
  }
  endShape(CLOSE);
}

// Walls class
class Boundary {
  constructor(x1, y1, x2, y2) {
    this.a = createVector(x1, y1);
    this.b = createVector(x2, y2);
  }

  show() {
    stroke(255); // Wall color
    line(this.a.x, this.a.y, this.b.x, this.b.y);
  }
}

// Rays class
class Ray {
  constructor(pos, angle) {
    this.pos = pos;
    this.dir = p5.Vector.fromAngle(angle);
  }

  cast(wall) {
    const x1 = wall.a.x;
    const y1 = wall.a.y;
    const x2 = wall.b.x;
    const y2 = wall.b.y;

    const x3 = this.pos.x;
    const y3 = this.pos.y;
    const x4 = this.pos.x + this.dir.x;
    const y4 = this.pos.y + this.dir.y;

    const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (den == 0) {
      return;
    }

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / den;
    if (t > 0 && t < 1 && u > 0) {
      const pt = createVector();
      pt.x = x1 + t * (x2 - x1);
      pt.y = y1 + t * (y2 - y1);
      return pt;
    } else {
      return;
    }
  }
}

// Particle class
class Particle {
  constructor() {
    this.pos = createVector(width / 2, height / 2);
    this.rays = [];
    for (let a = 0; a < 360; a += rayCount) {
      this.rays.push(new Ray(this.pos, radians(a)));
    }
  }

  update(x, y) {
    this.pos.set(x, y);
  }

  look(walls) {
    for (let ray of this.rays) {
      let closest = null;
      let record = Infinity;
      for (let wall of walls) {
        const pt = ray.cast(wall);
        if (pt) {
          const d = p5.Vector.dist(this.pos, pt);
          if (d < record) {
            record = d;
            closest = pt;
          }
        }
      }
      if (closest) {
        stroke(245, 219, 255,80); // Ray color
        line(this.pos.x, this.pos.y, closest.x, closest.y);
      }
    }
  }

  show() {
    fill(255);
    noStroke();
    ellipse(this.pos.x, this.pos.y, 4);
  }
}

// Function to check if a line intersects the ellipse
function isLineInsideEllipse(x1, y1, x2, y2) {
  // Check if both endpoints are inside the ellipse
  if (dist(x1, y1, ellipseCenter.x, ellipseCenter.y) < ellipseRadius &&
      dist(x2, y2, ellipseCenter.x, ellipseCenter.y) < ellipseRadius) {
    return true;
  }

  // Check if the line segment intersects the ellipse
  let dx = x2 - x1;
  let dy = y2 - y1;

  for (let t = 0; t <= 1; t += 0.01) {
    let x = x1 + t * dx;
    let y = y1 + t * dy;
    if (dist(x, y, ellipseCenter.x, ellipseCenter.y) < ellipseRadius) {
      return true;
    }
  }
  return false;
}
