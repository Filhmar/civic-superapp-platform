import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export const POI_KINDS = ['tourism', 'business', 'civic'] as const;
export type PoiKind = (typeof POI_KINDS)[number];

@Schema({ _id: false })
export class OpeningHours {
  /** 0=Sun … 6=Sat; "HH:MM" 24h; null day = closed. */
  @Prop({ required: true })
  day!: number;

  @Prop({ required: true })
  open!: string;

  @Prop({ required: true })
  close!: string;
}
const OpeningHoursSchema = SchemaFactory.createForClass(OpeningHours);

@Schema({ timestamps: true, collection: 'pois' })
export class Poi {
  @Prop({ required: true, index: true })
  tenantId!: string;

  @Prop({ type: String, required: true, enum: POI_KINDS })
  kind!: PoiKind;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  description!: string;

  @Prop()
  category?: string;

  @Prop({ type: [String], default: [] })
  photos!: string[];

  @Prop({ type: [OpeningHoursSchema], default: [] })
  hours!: OpeningHours[];

  @Prop({ default: 0 })
  rating!: number;

  @Prop({ type: { lat: Number, lng: Number }, required: true })
  geo!: { lat: number; lng: number };

  @Prop()
  address?: string;

  @Prop()
  contact?: string;

  @Prop({ default: 0 })
  order!: number;
}
export type PoiDocument = HydratedDocument<Poi>;
export const PoiSchema = SchemaFactory.createForClass(Poi);
PoiSchema.index({ tenantId: 1, kind: 1, order: 1 });
PoiSchema.index({ tenantId: 1, name: 'text', description: 'text' });

@Schema({ collection: 'favorites' })
export class Favorite {
  @Prop({ required: true, index: true })
  tenantId!: string;

  @Prop({ required: true })
  userId!: string;

  @Prop({ required: true })
  poiId!: string;
}
export const FavoriteSchema = SchemaFactory.createForClass(Favorite);
FavoriteSchema.index({ tenantId: 1, userId: 1, poiId: 1 }, { unique: true });

@Schema({ collection: 'transport_routes' })
export class TransportRoute {
  @Prop({ required: true, index: true })
  tenantId!: string;

  @Prop({ required: true })
  mode!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ type: [String], required: true })
  stops!: string[];

  @Prop({ required: true })
  fareMin!: number;

  @Prop({ required: true })
  fareMax!: number;

  @Prop({ default: false })
  popular!: boolean;

  @Prop({ default: 0 })
  order!: number;
}
export const TransportRouteSchema = SchemaFactory.createForClass(TransportRoute);
TransportRouteSchema.index({ tenantId: 1, popular: -1, order: 1 });

@Schema({ collection: 'recent_searches' })
export class RecentSearch {
  @Prop({ required: true, index: true })
  tenantId!: string;

  @Prop({ required: true })
  userId!: string;

  @Prop({ required: true })
  query!: string;

  @Prop({ type: Date, default: () => new Date(), expires: 60 * 60 * 24 * 30 })
  at!: Date;
}
export const RecentSearchSchema = SchemaFactory.createForClass(RecentSearch);
RecentSearchSchema.index({ tenantId: 1, userId: 1, at: -1 });
