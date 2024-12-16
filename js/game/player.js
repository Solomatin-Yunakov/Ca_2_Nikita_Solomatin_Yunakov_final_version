import GameObject from '../engine/gameobject.js';
import Animation from '../engine/Animation.js';
import Renderer from '../engine/renderer.js';
import Animator from '../engine/Animator.js';
import Physics from '../engine/physics.js';
import Input from "../engine/input.js";
import { Images, AudioFiles } from '../engine/resources.js';
import Platform from './platform.js';
import MovingPlatform from './movingPlatform.js';
import FinishPoint from './finishPoint.js';
import UI from '../engine/ui.js';
import ConveyorBelt from './conveyorBelt.js';
import Spike from './spike.js';

class Player extends GameObject {
    constructor(x, y, w, h) {
        super(x, y);

        // Add a Physics component to handle physics-based movement
        this.addComponent(new Physics({ x: 0, y: 0 }, { x: 0, y: 0 }));

        // Add an Input component to handle player input
        this.addComponent(new Input());

        // Create an Animator component to handle animations
        this.animator = new Animator('red', w, h);
        this.addComponent(this.animator);

        // Define animations for running, idling, and jumping
        let run = new Animation('red', w, h, this.getImages("./resources/images/player/Run", "Run", 6), 10);
        let idle = new Animation('red', w, h, this.getImages("./resources/images/player/Idle", "Idle", 4), 10);
        

        // Add animations to the animator
        this.animator.addAnimation("run", run);
        this.animator.addAnimation("idle", idle);

        // Set the initial animation to "idle"
        this.animator.setAnimation("idle");

        // Set the player's tag for identification
        this.tag = "player";

        // Initialize player properties
        this.isOnPlatform = false;
        this.direction = 1; // 1 for right, -1 for left
        this.defaultSpeed = 100;
        this.speed = 120;
        this.isJumping = false;
        this.jumpForce = 250;
        this.jumpTime = 1.0;
        this.jumpTimer = 0;
        this.startPoint = { x: x, y: y }; // Starting position for reset
        this.jumpCooldown = 2; // Cooldown time between jumps
        this.jumpCooldownTimer = 0;
    }

    update(deltaTime) {
        const physics = this.getComponent(Physics);
        const input = this.getComponent(Input);

        // Handle horizontal movement
        if (input.isKeyDown("ArrowRight")) {
            physics.velocity.x = this.speed;
            this.direction = 1;
            this.animator.setAnimation("run");
            AudioFiles.walk.play();
        } else if (input.isKeyDown("ArrowLeft")) {
            physics.velocity.x = -this.speed;
            this.direction = -1;
            this.animator.setAnimation("run");
            AudioFiles.walk.play();
        } else {
            physics.velocity.x = 0;
            this.animator.setAnimation("idle");
            AudioFiles.walk.pause();
        }

        // Pause the game if "P" key is pressed
        if (input.isKeyDown("KeyP")) {
            this.game.setPause();
        }

        // Handle jumping
        if (input.isKeyDown("ArrowUp") && this.isOnPlatform) {
            this.startJump();
        }

        // Update jump cooldown timer
        if (this.jumpCooldownTimer > 0) {
            this.jumpCooldownTimer -= deltaTime;
        }

        // Update jump logic
        if (this.isJumping) {
            this.updateJump(deltaTime);
        }

        // Check for collisions with platforms
        const platforms = this.game.gameObjects.filter((obj) => obj instanceof Platform || obj instanceof MovingPlatform || obj instanceof ConveyorBelt);
        for (const platform of platforms) {
            if (physics.isColliding(platform.getComponent(Physics))) {
                if (!this.isJumping) {
                    physics.acceleration.y = 0;
                    physics.velocity.y = 0;
                    this.y = platform.y - this.getComponent(Renderer).height;
                    this.isOnPlatform = true;

                    // Handle moving platforms
                    if (platform instanceof MovingPlatform) {
                        this.x += platform.getComponent(Physics).velocity.x * deltaTime;
                        this.y += platform.getComponent(Physics).velocity.y * deltaTime;
                    }

                    // Handle conveyor belts
                    if (platform instanceof ConveyorBelt) {
                        if (platform.direction === 'right') {
                            physics.velocity.x += platform.speed;
                        } else if (platform.direction === 'left') {
                            physics.velocity.x -= platform.speed;
                        }
                    }
                }
            }
        }

        // Reset player if they fall off the screen
        if (this.y > this.game.canvas.height) {
            this.x = this.startPoint.x;
            this.y = this.startPoint.y;
        }

        // Check for collision with the finish point
        const finishPoint = this.game.gameObjects.find((obj) => obj instanceof FinishPoint);
        if (finishPoint && physics.isColliding(finishPoint.getComponent(Physics))) {
            this.game.setPause();
            this.showCompletionLabel();
        }

        // Check for collision with spikes
        const spikes = this.game.gameObjects.filter((obj) => obj instanceof Spike);
        for (const spike of spikes) {
            if (physics.isColliding(spike.getComponent(Physics))) {
                this.resetPlayer();
            }
        }

        // Call the parent class's update method
        super.update(deltaTime);
    }

    // Start the jump
    startJump() {
        if (this.isOnPlatform && this.jumpCooldownTimer <= 0) {
            this.isJumping = true;
            this.jumpTimer = this.jumpTime;
            this.getComponent(Physics).velocity.y = -this.jumpForce;
            this.isOnPlatform = false;
            this.animator.setAnimation("jump");
            this.jumpCooldownTimer = this.jumpCooldown; // Set jump cooldown
        }
    }

    // Update the jump logic
    updateJump(deltaTime) {
        this.jumpTimer -= deltaTime;
        if (this.jumpTimer <= 0 || this.getComponent(Physics).velocity.y > 0) {
            this.isJumping = false;
        }
    }

    // Load images for animations
    getImages(path, baseName, numImages) {
        let images = [];
        for (let i = 1; i <= numImages; i++) {
            let img = new Image();
            img.src = path + "/" + baseName + " (" + i + ").png";
            images.push(img);
        }
        return images;
    }

    // Show a completion label when the game is finished
    showCompletionLabel() {
        const uiObject = new GameObject(0, 0);
        const ui = new UI('You finished the game!', this.game.canvas.width / 2, this.game.canvas.height / 2, '30px Arial', 'black', 'center', 'middle');
        uiObject.addComponent(ui);
        this.game.addGameObject(uiObject);
    }

    // Reset the player to the starting position
    resetPlayer() {
        this.x = this.startPoint.x;
        this.y = this.startPoint.y;
        this.getComponent(Physics).velocity.x = 0;
        this.getComponent(Physics).velocity.y = 0;
    }
}

export default Player;