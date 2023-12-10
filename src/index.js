import * as THREE from "three";
import * as THREEJS from "https://cdn.skypack.dev/three@0.133.1";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";


class InputController {
  constructor(keyMapping) {
    this._Initialize();
    this.keyPressed = {};
  }


  _handleKeyDown = (e) => {
    if (!this.keyPressed[e.key.toLowerCase()]) {
      this.keyPressed[e.key.toLowerCase()] = new Date().getTime();
      console.log(`Tecla pressionada: ${e.key.toLowerCase()}`);
    }
  };

  _handleKeyUp = (e) => {
    delete this.keyPressed[e.key.toLowerCase()];
    console.log(`Tecla liberada: ${e.key.toLowerCase()}`);
  };

  _Initialize() {
    this.current = {
      leftButton: false,
      rightButton: false,
      mouseX: 0,
      mouseY: 0,
      mouseXDelta: 0,
      mouseYDelta: 0,
    };
    this.previous = null;
    this.previousKeys = {};

    document.addEventListener("mousedown", (e) => this._OnMouseDown(e), false);
    document.addEventListener("mouseup", (e) => this._OnMouseUp(e), false);
    document.addEventListener("mousemove", (e) => this._OnMouseMove(e), false);
    document.addEventListener("keydown", this._handleKeyDown, false);
    document.addEventListener("keyup", this._handleKeyUp, false);
  }

  _OnMouseDown(e) {
    switch (e.button) {
      case 0: {
        this.current.leftButton = true;
        break;
      }
      case 1: {
        this.current.rightButton = true;
        break;
      }
    }
  }

  _OnMouseUp(e) {
    switch (e.button) {
      case 0: {
        this.current.leftButton = false;
        break;
      }
      case 1: {
        this.current.rightButton = false;
        break;
      }
    }
  }

  _OnMouseMove(e) {
    this.current.mouseX = e.pageX - window.innerWidth / 2;
    this.current.mouseY = e.pageY - window.innerHeight / 2;

    if (this.previous === null) {
      this.previous = { ...this.current };
    }

    this.current.mouseXDelta = this.current.mouseX - this.previous.mouseX;
    this.current.mouseYDelta = this.current.mouseY - this.previous.mouseY;
  }

  update() {
    if (this.previous !== null) {
      this.current.mouseXDelta = this.current.mouseX - this.previous.mouseX;
      this.current.mouseYDelta = this.current.mouseY - this.previous.mouseY;

      this.previous = { ...this.current };
      this.previousKeys = { ...this.keys };
    }
  }
}

class FirstPersonCamera {
  constructor(camera, object) {
    this._camera = camera;
    this._input = new InputController();
    this._rotation = new THREE.Quaternion();
    this._translation = new THREE.Vector3();
    this._phi = 0;
    this._theta = 0;

    this._movementSpeed = 20;
    this._altura = 5;
    this._object = object;
    this._alturaCamera = 6

  }

  setWeight(action, weight) {
    action.enabled = true;
    action.setEffectiveTimeScale(1);
    action.setEffectiveWeight(weight);
  }

  activateAction(action) {
    const clip = action.getClip();
    const settings = baseActions[clip.name];
    setWeight(action, settings.weight);
    action.play();
  }

  rotateObject180Degrees() {
    const rotationY = new THREE.Quaternion();
    rotationY.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI); // Rotação de 180 graus em torno do eixo Y

    this._object.applyQuaternion(rotationY);
  }

  update(timeElapsedS) {
    this._input.update();
    this._UpdateRotation(timeElapsedS);
    this._UpdateCamera(timeElapsedS);
    this._UpdatePosition(timeElapsedS);
  }

  _UpdateCamera(_) {
    this._camera.quaternion.copy(this._rotation);
  }

  _UpdatePosition(timeElapsedS) {
    const moveSpeed = this._movementSpeed * timeElapsedS;
    const offsetDistance = 3;

    if (this._input.keyPressed["w"]) {
      console.log("Moving forward");
      const forward = new THREE.Vector3(0, 0, -1);
      forward
        .applyQuaternion(this._rotation)
        .normalize()
        .multiplyScalar(moveSpeed);
      this._camera.position.add(forward);

      const offset = new THREE.Vector3(0, 0, -1);
      offset
        .applyQuaternion(this._rotation)
        .normalize()
        .multiplyScalar(offsetDistance);

      this._object.position.copy(this._camera.position).add(offset);

    }

    this.rotateObject180Degrees();


    this._camera.position.y = Math.max(this._camera.position.y, this._alturaCamera);
    this._camera.position.y = Math.min(this._camera.position.y, this._alturaCamera);

    this._object.position.y = Math.max(
      this._camera.position.y,
      this._altura - 2
    );
    this._object.position.y = Math.min(
      this._camera.position.y,
      this._altura - 2
    );
  }

  clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  _UpdateRotation(_) {
  const rotationSpeed = 0.05; // Ajuste a velocidade de rotação conforme necessário

  if (this._input.keyPressed["arrowleft"]) {
    this._phi += rotationSpeed;
  }

  if (this._input.keyPressed["arrowright"]) {
    this._phi -= rotationSpeed;
  }

  const qx = new THREE.Quaternion();
  qx.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this._phi);

  const q = new THREE.Quaternion();
  q.multiply(qx);

  this._rotation.copy(q);

  this._object.quaternion.copy(this._rotation);
}

}

class World {
  constructor() {
    this._Initialize();
  }
  _Initialize() {
    this._threejs = new THREE.WebGLRenderer();
    this._threejs.shadowMap.enabled = true;
    this._threejs.shadowMap.type = THREE.PCFSoftShadowMap;
    this._threejs.setPixelRatio(window.devicePixelRatio);
    this._threejs.setSize(window.innerWidth, window.innerHeight);

    document.body.appendChild(this._threejs.domElement);

    window.addEventListener(
      "resize",
      () => {
        this._OnWindowResize();
      },
      false
    );

    const fov = 60;
    const aspect = 1280 / 720;
    const near = 1.0;
    const far = 1000.0;

    this._camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this._camera.position.set(75, 20, 0);

    this._scene = new THREE.Scene();

    this._addLights();

    let loader = new GLTFLoader();

    let model,
      skeleton,
      mixer,
      clock,
      numAnimations = 0;
    clock = new THREE.Clock();
    const allActions = [];
    const baseActions = {
      idle: { weight: 1 },
      walk: { weight: 0 },
      run: { weight: 0 },
    };

    function setWeight(action, weight) {
      action.enabled = true;
      action.setEffectiveTimeScale(1);
      action.setEffectiveWeight(weight);
    }

    function activateAction(action) {
      const clip = action.getClip();
      const settings = baseActions[clip.name];
      setWeight(action, settings.weight);
      action.play();
    }

    const animate = function () {
      requestAnimationFrame(animate);
      for (let i = 0; i < numAnimations; i++) {
        const action = allActions[i];
        const clip = action.getClip();
        const settings = baseActions[clip.name];
        // settings.weight = action.getEffectiveWeight();
      }

      if (mixer) {
        const mixerUpdateDelta = clock.getDelta();
        mixer.update(mixerUpdateDelta);
      }
    };

    loader.load("https://threejs.org/examples/models/gltf/Xbot.glb", (gltf) => {
      model = gltf.scene;
      model = gltf.scene;
      model.rotateY(Math.PI);
      model.scale.set(2, 2, 2);
      this._scene.add(model);
      model.traverse(function (object) {
        if (object.isMesh) {
          object.castShadow = true;
          object.receiveShadow = true;
        } 
      });

      skeleton = new THREE.SkeletonHelper(model);
      skeleton.visible = true;
      this._scene.add(skeleton);
      const animations = gltf.animations;
      mixer = new THREEJS.AnimationMixer(model);

      let a = animations.length;
      let currentAnimation = 0; // Keep track of the current animation
      
      for (let i = 0; i < a; i++) {
        let clip = animations[i];
        const name = clip.name;
        if (baseActions[name]) {
          const action = mixer.clipAction(clip);
          baseActions[name].action = action;
          allActions.push(action);
          numAnimations += 1;
        }
      }
      // Initialize controls after loading the object
      this.controls = new FirstPersonCamera(this._camera, model);

      // Call the update method here or wherever appropriate
      // this.controls.update(0);
      animate();

      // Key and mouse events
      window.addEventListener("keydown", (e) => {
        const { keyCode } = e;
        if (keyCode === 87 || keyCode === 38) {
          baseActions.idle.weight = 0;
          baseActions.run.weight = 5;
          activateAction(baseActions.run.action);
          activateAction(baseActions.idle.action);
          movingForward = true;
        }
      });

      window.addEventListener("keyup", (e) => {
        const { keyCode } = e;
        if (keyCode === 87 || keyCode === 38) {
          baseActions.idle.weight = 1;
          baseActions.run.weight = 0;
          activateAction(baseActions.run.action);
          activateAction(baseActions.idle.action);
          movingForward = false;
        }
      });


      this._addGrid();

      this._RAF();
    });
  }

  _addGrid() {
    const grid = new THREE.GridHelper(10000, 1000);
    grid.receiveShadow = true;
    this._scene.add(grid);

    const axesHelper = new THREE.AxesHelper(15);
    this._scene.add(axesHelper);
  }
  _addBackground() {
    const loader = new THREE.CubeTextureLoader();
    const texture = loader.load([
      "../assets/posx.jpg",
      "../assets/negx.jpg",
      "../assets/posy.jpg",
      "../assets/negy.jpg",
      "../assets/posz.jpg",
      "../assets/negz.jpg",
    ]);
    this._scene.background = texture;
  }

  _addLights() {
    let light = new THREE.DirectionalLight("#fff", 1.0);
    light.position.set(20, 100, 10);
    light.target.position.set(0, 0, 0);
    light.castShadow = true;
    light.shadow.bias = -0.001;
    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = 500.0;
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 500.0;
    light.shadow.camera.left = 100;
    light.shadow.camera.right = -100;
    light.shadow.camera.top = 100;
    light.shadow.camera.bottom = -100;
    this._scene.add(light);

    light = new THREE.AmbientLight(0x101010);
    this._scene.add(light);
  }

  _OnWindowResize() {
    this._camera.aspect = window.innerWidth / window.innerHeight;
    this._camera.updateProjectionMatrix();
    this._threejs.setSize(window.innerWidth, window.innerHeight);
  }

  _RAF() {
    requestAnimationFrame((t) => {
      if (this._previousRAF === null) {
        this._previousRAF = t;
      }

      this._Step(t - this._previousRAF);
      this._threejs.render(this._scene, this._camera);
      this._previousRAF = t;
      this._RAF();
    });
  }

  _Step(timeElapsed) {
    const timeElapsedS = timeElapsed * 0.001;

    this.controls.update(timeElapsedS);
  }
}

let _APP = null;

window.addEventListener("DOMContentLoaded", () => {
  _APP = new World();
});
