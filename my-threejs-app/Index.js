import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import {CSS2DRenderer, CSS2DObject} from 'three/examples/jsm/renderers/CSS2DRenderer';

//globale variabelen
let firstLoad = true;
let xmlDocument = null;
let labels = [];
let labelLocaties = [];
let UitAnimatie = true;
let mixer; // AnimationMixer
let currentObject; // Bewaar het geladen FBX-object
let currentlyActiveLabel = null; // Houd de momenteel actieve annotatie bij
let Directory = "LA140A";
let isAnimatingPlane = false;
let targetPlaneHeight = 0;
let betonModel = null;
let textureColor = new THREE.Color(0.3, 0.3, 0.3);

const zoomLevel = Math.round(window.devicePixelRatio * 100);
console.log('Zoom Level:', zoomLevel + '%');



// Create a scene
const scene = new THREE.Scene();

// Create a camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 15;
camera.position.y = 4;  

// Maak een nieuw div-element met de klasse 'text-container'
const textContainer = document.createElement('div');
textContainer.className = 'text-container';

//create a div for annotations
const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0px';
labelRenderer.domElement.style.opacity = 0;
labelRenderer.domElement.style.pointerEvents = 'none';
document.body.appendChild(labelRenderer.domElement);

// Create a renderer and add it to the document
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
renderer.setClearColor(0xFFFFFF);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Orbit controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.03;

// Maak een loading manager
const loadingManager = new THREE.LoadingManager();

loadingManager.onProgress = function(url, loaded, total) {
    const progress = Math.floor((loaded / total) * 100);

    // Bepaal de juiste afbeelding op basis van het voortgangspercentage
    if (progress > 0 && progress < 20) {
        document.getElementById('LaadschermImg1').style.display = 'none';
        document.getElementById('LaadschermImg2').style.display = 'block';
    } if (progress > 20 && progress < 40) {
        document.getElementById('LaadschermImg2').style.display = 'none';
        document.getElementById('LaadschermImg3').style.display = 'block';
    } if (progress > 40 && progress < 60) {
        document.getElementById('LaadschermImg3').style.display = 'none';
        document.getElementById('LaadschermImg4').style.display = 'block';
    } if (progress > 60 && progress < 80) {
        document.getElementById('LaadschermImg4').style.display = 'none';
        document.getElementById('LaadschermImg5').style.display = 'block';
    } if (progress > 80 && progress < 100) {
        document.getElementById('LaadschermImg5').style.display = 'none';
        document.getElementById('LaadschermImg6').style.display = 'block';
        document.getElementById('WebsiteUI').style.display = 'block';
    }
};

const progressBarContainer = document.querySelector('.progress-bar-container');

loadingManager.onLoad = function(){
    progressBarContainer.style.display = 'none';
    if (firstLoad == true){
        LoadAnnotations();
        updateAllLabelsPosition(labels, currentObject);
        addClickEventsToLabels();
        firstLoad = false;
    }
}

// Use the loading manager with the loaders
const rgbeLoader = new RGBELoader(loadingManager);
const imageBitmapLoader  = new THREE.ImageBitmapLoader(loadingManager);
//imageBitmapLoader.setOptions({ imageOrientation: 'flipY' });
const glbLoader = new GLTFLoader(loadingManager);
const betonLoader = new GLTFLoader(loadingManager);

// Maak een vlak (plane) dat de schaduwen opvangt
const planeGeometry = new THREE.PlaneGeometry(50, 50);
const planeMaterial = new THREE.ShadowMaterial({ opacity: 0.5 }); // ShadowMaterial maakt het vlak onzichtbaar behalve voor schaduwen
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.rotation.x = - Math.PI / 2;
plane.position.y = -3.8;
plane.visible = false;
plane.material.opacity = 0.05;
plane.receiveShadow = true; // Zorg ervoor dat het vlak schaduwen opvangt
scene.add(plane);

// Lichtbron (spotlight) toevoegen
const spotLight = new THREE.SpotLight(0xffffff);
spotLight.position.set(0, 30, 20);
spotLight.castShadow = true;
spotLight.visible = false;
spotLight.shadow.mapSize.width = 4024;  // Resolutie van de schaduwmap
spotLight.shadow.mapSize.height = 4024;
scene.add(spotLight);

// XML-bestand inladen
fetch('Public/'+Directory+'/'+Directory+'_Anotations.xml')
  .then(response => response.text())
  .then(data => {
    const parser = new DOMParser(loadingManager);
    xmlDocument = parser.parseFromString(data, "application/xml");
  })
  .catch(error => console.error('Error loading the XML file:', error));

function LoadAnnotations() {
    if (xmlDocument) {
        const parts = xmlDocument.getElementsByTagName("part");

        // Loop door alle <part> elementen in de XML
        for (let i = 0; i < parts.length; i++) {
            const id = parts[i].getElementsByTagName("id")[0].textContent;
            const title = parts[i].getElementsByTagName("title")[0].textContent;
            const index = parts[i].getElementsByTagName("partIndex")[0].textContent;

            console.log(`Part ${i + 1}: ID = ${id}, TITLE = ${title}, INDEX = ${index}`);

            // Creëer een paragraaf element voor elk part
            const p = document.createElement('p');
            p.textContent = title;       // Voeg de titel van het part toe
            p.className = 'annotation';  // Voeg de CSS class toe
            p.id = id;                   // De id komt overeen met de naam van het child-object

            // Maak een CSS2DObject van de paragraaf
            const cPointLabel = new CSS2DObject(p);

            // Voeg de annotatie toe aan de scene
            scene.add(cPointLabel);

            // Voeg de annotatie toe aan de labels array
            labels.push(cPointLabel);
        }

        // Globale labels array bijwerken voor later gebruik
        window.labels = labels;
        console.log('Alle labels zijn geladen en toegevoegd aan de scene:', labels);
    } else {
        console.log("XML-bestand is nog niet geladen!");
    }
}

// Load environment texture
rgbeLoader.load('Public/metro_vijzelgracht_2k.hdr', (hdrTexture) => {
    hdrTexture.mapping = THREE.EquirectangularReflectionMapping; // Equirectangular HDRI
    scene.environment = hdrTexture; // Stel in als omgevingslicht
});

// Laad een aparte afbeelding voor de achtergrond
imageBitmapLoader.load('Public/VMG_Background.jpg', function (imageBitmap) {
    const bgTexture = new THREE.CanvasTexture(imageBitmap);
    bgTexture.mapping = THREE.EquirectangularReflectionMapping;
    //scene.background = bgTexture;
});

function toggleCircles(element) {
    if ($(element).html() === "Annotations" || $(element).hasClass('TogleA')) {
        if ($('.TogleA').attr('src') === "Assets/Oranje_cirkel_vol.png") {
            $('.TogleA').attr('src', 'Assets/Oranje_cirkel_open.png');
            labelRenderer.domElement.style.display = "none";
            if(UitAnimatie == true){
                hidePartsByName(currentObject, "Pijl"); // Verberg de onderdelen genaamd "Pijl"
            }
            AnnotationsActive = false;
        } else {
            $('.TogleA').attr('src', 'Assets/Oranje_cirkel_vol.png');
            labelRenderer.domElement.style.display = "block";
            if(UitAnimatie == true){
                ShowPartsByName(currentObject, "Pijl");
            }     
            AnnotationsActive = true;
        }
    }

    if ($(element).html() === "Environment" || $(element).hasClass('TogleB')) {
        if ($('.TogleB').attr('src') === "Assets/Oranje_cirkel_open.png") {
            $('.TogleB').attr('src', 'Assets/Oranje_cirkel_vol.png');
            plane.visible = false;
            spotLight.visible = false;
            betonModel.visible = true;
        } else {
            $('.TogleB').attr('src', 'Assets/Oranje_cirkel_open.png');
            plane.visible = true;
            spotLight.visible = true;
            betonModel.visible = false;
        }
    }
}

function hidePartsByName(object, name) {
    object.traverse((child) => {
        if (child.name && child.name.includes(name)) { // Controleer of 'name' in de naam voorkomt
            child.visible = false; // Verberg het object
        }
    });
}


function ShowPartsByName(object, name) {
    object.traverse((child) => {
        if (child.name && child.name.includes(name)) { // Controleer of 'name' in de naam voorkomt
            child.visible = true; // Verberg het object
        }
    });
}

// Voeg de klik-functie toe aan zowel .LijnStyle, .TogleA en .TogleB
$('.BalkOptie, .TogleA, .TogleB').click(function() {
    toggleCircles(this);
});

// Create arrays for loading different textures
const baseColorArray = ["Public/"+Directory+"/Textures/Base/"+Directory+"_BaseColor.png", "Public/"+Directory+"/Textures/Stress/"+Directory+"_BaseColor.png"];
const metallicArray = ["Public/"+Directory+"/Textures/Base/"+Directory+"_Metallic.png", "Public/"+Directory+"/Textures/Stress/"+Directory+"_Metallic.png"];
const normalArray = ["Public/"+Directory+"/Textures/Base/"+Directory+"_Normal.png", "Public/"+Directory+"/Textures/Stress/"+Directory+"_Normal.png"];
const roughnessArray = ["Public/"+Directory+"/Textures/Base/"+Directory+"_Roughness.png", "Public/"+Directory+"/Textures/Stress/"+Directory+"_Roughness.png"];
const emissionArray = ["Public/"+Directory+"/Textures/Base/"+Directory+"_Emission.png", "Public/"+Directory+"/Textures/Stress/"+Directory+"_Emission.png"];
const alphaArray = ["Public/"+Directory+"/Textures/Base/"+Directory+"_Alpha.png", "Public/"+Directory+"/Textures/Stress/"+Directory+"_Alpha.png"]; // New alpha array

$('.MateriaalKeuze').click(function(){
    if (this.text == "Coated"){
        UpdateTextures(0);
        textureColor.set(0.3, 0.3, 0.3);
    }
    else if (this.text == "Stress"){
        UpdateTextures(1);
        textureColor.set(0.3, 0.3, 0.3);
    }
});

$('.KleurSelectie').click(function(){
    var imageSrc = $(this).attr('src');

    if (imageSrc == "Assets/Kleur1-8.png"){
        textureColor.set(0.3, 0.3, 0.3);
    }
    else if (imageSrc == "Assets/Kleur2-8.png") {
        textureColor.set(2.3, 2.3, 2.3);
    }
    else if (imageSrc == "Assets/Kleur3-8.png") {
        textureColor.set(0.8, 0.4, 0);
    }
    else if (imageSrc == "Assets/Kleur4-8.png") {
        textureColor.set(0.1, 0.3, 1.0);
    }
    else if (imageSrc == "Assets/Kleur5-8.png") {
        textureColor.set(0.3, 0.8, 0.3);
    }
    UpdateTextures(0);
});

function UpdateTextures(Index) {
    let selectedIndex = Index

    const textureUrls = {
        baseColor: baseColorArray[selectedIndex],
        metallic: metallicArray[selectedIndex],
        roughness: roughnessArray[selectedIndex],
        normal: normalArray[selectedIndex],
        emission: emissionArray[selectedIndex],
        alpha: alphaArray[selectedIndex], 
    };

    loadTextures(textureUrls, (textures) => {
        applyTextures(textures);
    });
}


function loadTextures(textureUrls, callback) {
    const textures = {};
    const textureNames = Object.keys(textureUrls);
    let loadedCount = 0;
    let expectedCount = textureNames.length;

    textureNames.forEach((name) => {
        imageBitmapLoader.load(
            textureUrls[name],
            (imageBitmap) => {
                const texture = new THREE.CanvasTexture(imageBitmap);
                textures[name] = texture;
                loadedCount++;
                if (loadedCount === expectedCount) {
                    callback(textures);
                }
            },
            undefined,
            (err) => {
                console.warn(`Failed to load ${name} texture. Skipping this texture.`, err);
                // Reduce expected count if the texture is not found
                expectedCount--;
                if (loadedCount === expectedCount) {
                    callback(textures);
                }
            }
        );
    });
}

function applyTextures(textures) {
    currentObject.traverse((child) => {
        if (child.isMesh && child.name.includes(Directory)) {
            // Materiaalparameters instellen

            const materialParams = {
                color: new THREE.Color(textureColor), // Standaard base color
                metalness: 1, // Maximaal metallic voor reflecties
                roughness: 0.5, // Matige ruwe reflectie
                normalScale: new THREE.Vector2(1, 1), // Normalmap schaal
                emissive: new THREE.Color(0.1, 0.1, 0.1), // Emissieve kleur
                emissiveIntensity: 4, // Intensiteit van emissie
                transparent: true, // Transparantie toestaan
                envMapIntensity: 1.0, // Intensiteit van HDRI
            };

            // Teksturen toepassen als ze beschikbaar zijn
            if (textures.baseColor) materialParams.map = textures.baseColor;
            if (textures.metallic) materialParams.metalnessMap = textures.metallic;
            if (textures.roughness) materialParams.roughnessMap = textures.roughness;
            if (textures.normal) materialParams.normalMap = textures.normal;
            if (textures.emission) materialParams.emissiveMap = textures.emission;
            if (textures.alpha) {
                materialParams.alphaMap = textures.alpha;
                materialParams.transparent = true; // Alleen transparant als alpha bestaat
            }

            // Maak het materiaal en pas toe op de mesh
            const material = new THREE.MeshStandardMaterial(materialParams);
            child.material = material;
        }

        // Speciale logica voor "Pijl"-delen
        if (child.isMesh && child.name.includes("Pijl")) {
            child.material.side = THREE.FrontSide;
        }
    });
}

// Instantieer de GLBLoader
glbLoader.load(
    'Public/'+Directory+'/'+ Directory + '.glb',
    (gltf) => {
        currentObject = gltf.scene; // Gebruik `gltf.scene` in plaats van `object`
        UpdateTextures(0); // Laad de initiële texturen

        currentObject.scale.set(4, 4, 4);
        currentObject.rotation.set(0, 10.3, 0);
        currentObject.position.set(-4, -4, 0);

        // Door alle meshes in het model itereren en `castShadow` instellen
        currentObject.traverse((node) => {
            if (node.isMesh) {
                node.castShadow = true;  // Zorg ervoor dat elke mesh schaduwen werpt
                node.receiveShadow = true; // Optioneel: als de mesh schaduwen moet ontvangen
            }
        });

        scene.add(currentObject);

        $('.ExplodedView').click(function(){
            // Check if the model has animations
            if (gltf.animations && gltf.animations.length > 0) {
                // Create an AnimationMixer and play only animations ending with "UIT"
                mixer = new THREE.AnimationMixer(currentObject);
    
                if(UitAnimatie == true){
                    // Loop through all animations, filter those ending with "UIT", and play them once
                    gltf.animations.forEach((clip) => {
                    if (clip.name.endsWith("Uit")) {  // Check if the animation name ends with "UIT"
                        const action = mixer.clipAction(clip);
                        action.setLoop(THREE.LoopOnce, 1); // Set the animation to play once
                        action.clampWhenFinished = true;   // Stop at the last frame
                        action.play();
                        AnimateShadowCatcher(-10);
                        hidePartsByName(currentObject, "Pijl");
                    }
                });
                }
    
                if(UitAnimatie == false){
                    // Loop through all animations, filter those ending with "UIT", and play them once
                    gltf.animations.forEach((clip) => {
                    if (clip.name.endsWith("In")) {  // Check if the animation name ends with "UIT"
                        const action = mixer.clipAction(clip);
                        action.setLoop(THREE.LoopOnce, 1); // Set the animation to play once
                        action.clampWhenFinished = true;   // Stop at the last frame
                        action.play();
                        AnimateShadowCatcher(-3.8);
                        if (labelRenderer.domElement.style.display !== "none") {
                            ShowPartsByName(currentObject, "Pijl");
                        }
                    }
                });
                }
            }
            UitAnimatie = !UitAnimatie;
        });
        
        // Positie van alle labels bijwerken
        updateAllLabelsPosition(labels, currentObject);
        labelRenderer.domElement.style.opacity = 1;
    },
    undefined,
    (error) => {
        console.error('An error happened while loading the GLB model.', error);
    }
);

betonLoader.load(
  'BetonblokTexture.glb', // Replace this with your GLB file path
  (gltf) => {
    const model = gltf.scene;
    model.scale.set(4, 4, 4);
    model.rotation.set(0, 10.3, 0);
    model.position.set(-4, -4, 0);
    scene.add(model);

    betonModel = model;  // Store the model in the variable for later use
  },
  (xhr) => {
    console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
  },
  (error) => {
    console.error('An error happened while loading the GLB:', error);
  }
);

function AnimateShadowCatcher(height) {
    targetPlaneHeight = height; // Stel het doel in voor de hoogte van de plane
    isAnimatingPlane = true; // Zet de animatie aan
}

/**
 * Functie om de positie van een object in de scene op basis van de naam te verkrijgen.
 * @param {Object3D} parent - Het ouderobject dat kinderen bevat.
 * @param {string} childName - De naam van het child-object waarvan de wereldpositie moet worden opgehaald.
 * @returns {Vector3|null} De wereldpositie van het child-object als Vector3 of null als het niet wordt gevonden.
 */
function getChildWorldPosition(parent, childName) {
    let worldPosition = null; // Variabele om de wereldpositie op te slaan
    
    // Doorloop alle kinderen van het parent-object
    if(parent){
        parent.traverse(function(node) {
            if (node.isMesh && node.name === childName) {
                // Creëer een nieuwe Vector3 om de wereldpositie op te slaan
                worldPosition = new THREE.Vector3();
                node.getWorldPosition(worldPosition); // Verkrijg de wereldpositie
            }
        });
    }
    
    return worldPosition;
}

/**
 * Functie om de positie van alle labels bij te werken op basis van de wereldpositie van de corresponderende child-objecten.
 * @param {Array} labels - Een array van CSS2DObjects (labels) die moeten worden bijgewerkt.
 * @param {Object3D} parent - Het hoofdobject waarin de child-objecten worden gezocht.
 */
function updateAllLabelsPosition(labels, parent) {
    labelLocaties = [];
    labels.forEach(label => {
        const childName = label.element.id; // Verkrijg de id van de paragraaf als child-naam
        const childPosition = getChildWorldPosition(parent, childName);

        if (childPosition) {
            // Voeg een offset van +1 toe aan de hoogte (Y-coördinaat)
            childPosition.y += 1;

            // Update de positie van het label
            label.position.copy(childPosition);
            labelLocaties.push(childPosition);
        }
    });
}

// Function to find and return an object in the scene by its name
function findObjectByName(parent, name) {
    let found = null;
    parent.traverse(function (node) {
        if (node.isMesh && node.name === name) {
            found = node;
        }
    });
    return found;
}

function addClickEventsToLabels() {
    labels.forEach(label => {
        // Zorg ervoor dat alleen de annotaties klikbaar zijn
        label.element.style.pointerEvents = 'auto';
        label.element.style.cursor = 'pointer'; // Voeg een pointer cursor toe voor visuele feedback

        // Bewaar de originele tekst van elk label in een data-attribute
        label.element.dataset.originalText = label.element.textContent;

        // Voeg een click event toe aan elk label
        label.element.addEventListener('click', function (event) {
            console.log(`Geklikt op label: ${label.element.id}`);
            event.preventDefault(); // Stop standaardgedrag
            event.stopPropagation(); // Voorkom dat de klik doorgegeven wordt aan de camera controls
            onLabelClick(label.element);
        });
    });
}

// Function to deselect all annotations
function deselectAllAnnotations() {
    // Loop door alle labels
    labels.forEach(label => {
        const partId = label.element.id; // Haal het ID van het label op
        let partElement = null;

        // Zoek het juiste part-element op basis van het ID
        const parts = xmlDocument.getElementsByTagName("part");
        for (let i = 0; i < parts.length; i++) {
            const idElement = parts[i].getElementsByTagName("id")[0];
            if (idElement && idElement.textContent === partId) {
                partElement = parts[i];
                break; // Stop met zoeken zodra we het juiste element vinden
            }
        }

        // Controleer of er een corresponderend XML-element is gevonden
        if (partElement) {
            const originalTitle = partElement.getElementsByTagName("title")[0].textContent; // Haal de originele titel op uit de XML

            // Reset het HTML-element van het label naar de standaard waarde
            label.element.className = "annotation"; // Reset de class naar de standaard 'annotation'
            label.element.innerHTML = originalTitle; // Herstel de originele titel
        } else {
            console.warn(`Part with ID ${partId} not found in the XML.`);
        }
    });
            $('.AnnotationText').animate({ right: '-400px' }, 300);  // 300 milliseconden (0.3 seconden)
        
    // Clear de momenteel actieve annotatie
    currentlyActiveLabel = null;

    // Maak de tekstcontainer leeg
    textContainer.innerHTML = "";
}

// Event listener to deselect annotations when clicking outside
document.addEventListener('click', (event) => {
    // Check if the click was outside of any annotation element
    const clickedOutside = !labels.some(label => label.element.contains(event.target));

    if (clickedOutside) {
        deselectAllAnnotations(); // Deselect all annotations if clicked outside
    }
});

let currentlyActivePart = null; // To keep track of the currently active (glowing) part

// Modified onLabelClick function to add glow effect to the corresponding 3D object
function onLabelClick(element) {
    // Set the className of the previously active annotation back to 'annotation'
    if (currentlyActiveLabel && currentlyActiveLabel !== element) {
        currentlyActiveLabel.className = "annotation";
        currentlyActiveLabel.innerHTML = currentlyActiveLabel.dataset.originalText;
    }

    // Remove glow effect from previously active part
    if (currentlyActivePart && currentlyActivePart !== element) {
        currentlyActivePart = null; // Clear the currently active part
    }
    
    $('.AnnotationText').animate({ right: '0px' }, 300);

    // Update the currently active annotation and find the associated part
    let targetPosition;

    if (xmlDocument) {
        const parts = xmlDocument.getElementsByTagName("part");
    
        for (let i = 0; i < parts.length; i++) {
            const index = parts[i].getElementsByTagName("partIndex")[0].textContent;
            const id = parts[i].getElementsByTagName("id")[0].textContent;
            const title = parts[i].getElementsByTagName("title")[0].textContent;
    
            if (element.id == id) {
                targetPosition = labelLocaties[index];
                textContainer.innerHTML = "<strong>" + title + "</strong>";
                $('#AnnotationsInfoTitle').html(title);
                $('#AnnotationsDetails').html("");
    
                // Get descriptions only for the current part
                const descriptions = parts[i].getElementsByTagName("descriptions");
    
                for (let j = 0; j < descriptions.length; j++) {
                    // Display descriptionTitle once per descriptions block
                    const descriptionTitle = descriptions[j].getElementsByTagName("descriptionTitle")[0].textContent;
                    
                    $('#AnnotationsDetails').append(`<br><a>${descriptionTitle}</a><ul class='AnnotationsList'></ul>`);
    
                    const descriptionParts = descriptions[j].getElementsByTagName("descriptionPart");
                    
                    for (let k = 0; k < descriptionParts.length; k++) {
                        const partText = descriptionParts[k].textContent;
    
                        // Append each descriptionPart under the same title in the HTML
                        $('#AnnotationsDetails ul:last').append(`<li>${partText}</li>`);
                    }
                }
            }
        }
    }
    
    
    

    // Focus the camera on the target position
    focusCameraOnTarget(targetPosition);

    // Find the associated part in the scene
    const associatedPart = findObjectByName(scene, element.id); // Update the function call
    if (associatedPart) {
        currentlyActivePart = associatedPart; // Store the currently active part
    } else {
        console.warn(`No object found with the name: ${element.id}`);
    }

    // Set the className of the clicked label to 'annotationActive'
    element.className = "annotationActive";

    // Remove all children of element
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }

    // Add textContainer as a child to the element
    element.appendChild(textContainer);

    // Update the currently active annotation
    currentlyActiveLabel = element;

    // Stop propagation to prevent the document click event from firing
    event.stopPropagation();
}

function focusCameraOnTarget(targetPosition) {
    const duration = 1; // Duration in seconds
    const initialTime = performance.now(); // Start time of the animation
    const initialCameraPosition = camera.position.clone(); // Initial camera position

    // Calculate the target position with an offset
    const offset = new THREE.Vector3(0, 2, 5); // Offset of camera in x, y, z
    const targetCameraPosition = targetPosition.clone().add(offset);

    // Easing function for smooth acceleration and deceleration
    function easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    // Animation function to be called in the animation loop
    function animateCamera() {
        const elapsedTime = (performance.now() - initialTime) / 1000; // Time elapsed in seconds
        let t = elapsedTime / duration; // Normalized time (0 to 1)
        t = Math.min(t, 1); // Clamp t to range [0, 1]

        // Apply the easing function to the normalized time
        const easedT = easeInOutCubic(t);

        // Linearly interpolate between initial and target positions with easing
        camera.position.lerpVectors(initialCameraPosition, targetCameraPosition, easedT);
        
        // Smoothly orient the camera towards the target position
        camera.lookAt(targetPosition);

        // Update controls target if using OrbitControls
        controls.target.copy(targetPosition);

        // Continue animation until t reaches 1
        if (t < 1) {
            requestAnimationFrame(animateCamera); // Request the next frame
        }
    }

    // Start the animation
    animateCamera();
}

function isAnimationPlaying(mixer) {
    if (mixer && mixer._actions) {
        return mixer._actions.some(action => action.isRunning());
    }
    return false;
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    if (mixer) {
        const delta = clock.getDelta(); // Get the time elapsed since the last frame
        mixer.update(delta); // Update the mixer
    }

    if (mixer && isAnimationPlaying(mixer)) {
        updateAllLabelsPosition(labels, currentObject);
    }

    if (isAnimatingPlane) {
        const speed = 0.05;  // Snelheid van de animatie, je kunt dit aanpassen

        // Beweeg de plane positie geleidelijk naar de target hoogte
        if (Math.abs(plane.position.y - targetPlaneHeight) > 0.01) {
            plane.position.y += (targetPlaneHeight - plane.position.y) * speed;
        } else {
            plane.position.y = targetPlaneHeight; // Snap naar de doelhoogte
            isAnimatingPlane = false; // Animatie stoppen zodra we de target bereiken
        }
    }

    controls.update(); // If using OrbitControls, update them
    labelRenderer.render(scene, camera);
    
    // Render the scene
    renderer.render(scene, camera);
}
// Create a clock for the animation mixer
const clock = new THREE.Clock();

animate();

//Window resize function
window.addEventListener('resize', function(){
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, this.window.innerHeight);
    labelRenderer.setSize(this.window.innerWidth, this.window.innerHeight);
});

$('.Pijltje').click(function(){
    if ($('.UitklapMenu').css('left') === "0px") {  
        $('.UitklapMenu').animate({ left: '-630px' }, 300);  // 300 milliseconden (0.3 seconden)
        $('.Pijltje').css('transform', 'scaleX(-1)');
    } else {
        $('.UitklapMenu').animate({ left: '0px' }, 300);  // Ook 300 milliseconden voor terugzetten
        $('.Pijltje').css('transform', 'scaleX(1)');
    }
});

$('#Export3D').click(function() {
    // Maak een tijdelijk a-element aan
    const link = document.createElement('a');
    // Stel de href in naar het bestand in de public map
    link.href = 'Public/'+Directory+'/'+ Directory + '.glb'; // Verander dit naar het pad van jouw bestand
    // Het `download` attribuut zorgt ervoor dat de browser het bestand downloadt
    link.download = Directory+'.glb'; // Optioneel: geef het bestand een naam bij download
    // Voeg het tijdelijk toe aan het document
    document.body.appendChild(link);
    // Klik op de link om de download te starten
    link.click();
    // Verwijder de link weer uit het document
    document.body.removeChild(link);
});


$('.AnnotationText').css('right', '-400px');
