async function Buildings() {
    const fet = await fetch("https://campusmap.ufl.edu/assets/boundaries.json"); //fetch the data to populate the database
    const data = await fet.json();

    //The structure of the data base is typically features->properties->Whatever we need
    const locations = data.features.map((feature: any) => ({//Quick fix with the any
        id: feature.properties.PropSTCode, //Unsure here as there is a PropSTCode and a PropCID
        name: feature.properties.PropName,
        latitude: feature.properties.Latitude,
        longitude: feature.properties.Longitude,
    }))
    .filter( //filtering buildings with empty variables
        (locate : any) =>
            locate.id &&
            locate.name &&
            locate.latitude != null &&
            locate.longitude != null
    );
    
    const result = await Prisma.locations.createMany({
        data : locations
    });

}
