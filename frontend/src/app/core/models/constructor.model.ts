export interface Constructor {
  id: number;
  constructorRef: string;
  name: string;
  nationality: string;
}

export interface ConstructorStanding {
  position: number;
  constructorId: number;
  constructorRef: string;
  constructorName: string;
  nationality: string;
  points: number;
  wins: number;
  podiums: number;
  racesEntered: number;
}
