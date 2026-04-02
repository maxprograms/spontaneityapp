interface Location{
    id: string;
    name: string;
    lat: number;
    lng: number;
}

class Graph {
    private cell_size: number;
    private grid: Map<number, Map<number, Location[]>>;
    private location_index: Map<string, Location>;

    constructor(cell_size: number) {
        this.cell_size = cell_size;
        this.grid = new Map();
        this.location_index = new Map();
    }

    private get_cell(lat: number, lng: number): [number, number] {
        const i = Math.floor(lat / this.cell_size);
        const j = Math.floor(lng / this.cell_size);
        return [i, j];
    }

    private get_or_create_cell(i: number, j: number): Location[] {
        if (!this.grid.has(i)) {
            this.grid.set(i, new Map());
        }
        const row = this.grid.get(i)!;
        if (!row.has(j)) {
            row.set(j, []);
        }
        return row.get(j)!;
    }

    add_node(location: Location): void {
        if (this.location_index.has(location.id)) {
            throw new Error(`Location ${location.name} already exists`);
        }
        const [i, j] = this.get_cell(location.lat, location.lng);
        this.get_or_create_cell(i, j).push(location);
        this.location_index.set(location.id, location);
    }

    remove_node(id: string): void {
        const location = this.location_index.get(id);
        if (!location) throw new Error("Location not found");

        const [i, j] = this.get_cell(location.lat, location.lng);
        const cell = this.grid.get(i)?.get(j);
        if (cell) {
            const updated = cell.filter(loc => loc.id !== id);
            if (updated.length === 0) {
                this.grid.get(i)!.delete(j);
                if (this.grid.get(i)!.size === 0) {
                    this.grid.delete(i);
                }
            } else {
                this.grid.get(i)!.set(j, updated);
            }
        }
        this.location_index.delete(id);
    }

    update_node(id: string, new_lat: number, new_lng: number): void {
        const location = this.location_index.get(id);
        if (!location) throw new Error("Location not found");

        const [old_i, old_j] = this.get_cell(location.lat, location.lng);
        const [new_i, new_j] = this.get_cell(new_lat, new_lng);

        // remove from old cell
        const old_cell = this.grid.get(old_i)?.get(old_j);
        if (old_cell) {
            const updated = old_cell.filter(loc => loc.id !== id);
            if (updated.length === 0) {
                this.grid.get(old_i)!.delete(old_j);
                if (this.grid.get(old_i)!.size === 0) {
                    this.grid.delete(old_i);
                }
            } else {
                this.grid.get(old_i)!.set(old_j, updated);
            }
        }

        // update location and insert into new cell
        location.lat = new_lat;
        location.lng = new_lng;
        this.get_or_create_cell(new_i, new_j).push(location);
    }

    // MIDPOINT CALCULATIONS: Takes two Locations
    findMeetupSpots(
        a: Location,
        b: Location,
        maxCellRadius: number = 3,
        limit: number = 5
    ): { location: Location; distance: number }[] {

        const midLat = (a.lat + b.lat) / 2;
        const midLng = (a.lng + b.lng) / 2;

        // distance function
        const distance = (aLat: number, aLng: number, bLat: number, bLng: number): number => {
            return Math.sqrt((bLat - aLat) ** 2 + (bLng - aLng) ** 2);
        };

        let candidates: Location[] = [];
        for (let radius = 0; radius <= maxCellRadius; radius++) {
            candidates = this.get_within_radius(midLat, midLng, radius);
            if (candidates.length > 0) break;
        }

        if (candidates.length === 0) return [];

        // maps each potential location to its distance from the true midpoint
        const with_distances = candidates.map(loc => ({
            location: loc,
            distance: distance(midLat, midLng, loc.lat, loc.lng),
        }));

        const sorted = with_distances.sort((a, b) => a.distance - b.distance);

        return sorted.slice(0, limit);
    }

    get_location(id: string): Location | undefined {
        return this.location_index.get(id);
    }

    // search within single cell
    get_nearby(lat: number, lng: number): Location[] {
        const [i, j] = this.get_cell(lat, lng);
        return this.grid.get(i)?.get(j) ?? [];
    }

    // search within a specific cell radius
    get_within_radius(lat: number, lng: number, cell_radius: number): Location[] {
        const [ci, cj] = this.get_cell(lat, lng);
        const results: Location[] = [];

        for (let i = ci - cell_radius; i <= ci + cell_radius; i++) {
            for (let j = cj - cell_radius; j <= cj + cell_radius; j++) {
                const cell = this.grid.get(i)?.get(j);
                if (cell) results.push(...cell);
            }
        }
        return results;
    }

    get_cell_bounds(lat: number, lng: number): { min_lat: number, max_lat: number, min_lng: number, max_lng: number } {
        const [i, j] = this.get_cell(lat, lng);
        return {
            min_lat: i * this.cell_size,
            max_lat: (i + 1) * this.cell_size,
            min_lng: j * this.cell_size,
            max_lng: (j + 1) * this.cell_size,
        };
    }

    get_all_locations(): Location[] {
        return Array.from(this.location_index.values());
    }

    get_populated_cells(): { i: number, j: number, locations: Location[] }[] {
        const cells: { i: number, j: number, locations: Location[] }[] = [];
        for (const [i, row] of this.grid) {
            for (const [j, locations] of row) {
                cells.push({ i, j, locations });
            }
        }
        return cells;
    }

    size(): number {
        return this.location_index.size;
    }

    clear(): void {
        this.grid.clear();
        this.location_index.clear();
    }

    // for debugging
    print(): void {
        if (this.grid.size === 0) {
            console.log("(empty grid)");
            return;
        }

        // find the bounds of all populated cells
        let min_i = Infinity, max_i = -Infinity;
        let min_j = Infinity, max_j = -Infinity;

        for (const [i, row] of this.grid) {
            for (const [j] of row) {
                if (i < min_i) min_i = i;
                if (i > max_i) max_i = i;
                if (j < min_j) min_j = j;
                if (j > max_j) max_j = j;
            }
        }

        // build and print the grid row by row
        for (let i = min_i; i <= max_i; i++) {
            const row_parts: string[] = [];
            for (let j = min_j; j <= max_j; j++) {
                const cell = this.grid.get(i)?.get(j);
                const count = cell ? cell.length : 0;
                row_parts.push(`[${count}]`);
            }
            console.log(row_parts.join(" "));
        }
    }
}