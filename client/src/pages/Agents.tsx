import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Building2, Mail, Phone, Star } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

export default function Agents() {
  const [searchTerm, setSearchTerm] = useState("");
  
  const { data: agents, isLoading } = trpc.agents.list.useQuery();

  const filteredAgents = agents?.filter(agent => 
    agent.agency?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.bio?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-2xl font-bold">
            <Building2 className="h-8 w-8 text-primary" />
            <span>Real Estate Platform</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/properties" className="text-muted-foreground hover:text-foreground transition-colors">
              Properties
            </Link>
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
              Dashboard
            </Link>
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Real Estate Agents</h1>
          <p className="text-muted-foreground mb-6">
            Find experienced real estate professionals to help you buy or sell your property
          </p>
          
          <Input
            type="search"
            placeholder="Search agents by agency or specialization..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          </div>
        ) : filteredAgents.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No agents found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAgents.map(agent => (
              <Card key={agent.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                      {agent.agency?.charAt(0) || 'A'}
                    </div>
                    {agent.rating && (
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{(agent.rating / 20).toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                  <CardTitle>{agent.agency || 'Real Estate Agent'}</CardTitle>
                  <CardDescription>
                    {agent.licenseNumber && `License: ${agent.licenseNumber}`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {agent.bio && (
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {agent.bio}
                    </p>
                  )}

                  {agent.specialization && (
                    <div className="flex flex-wrap gap-2">
                      {JSON.parse(agent.specialization).map((spec: string, idx: number) => (
                        <span key={idx} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                          {spec}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2 pt-4 border-t">
                    {agent.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{agent.phone}</span>
                      </div>
                    )}
                    {agent.website && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <a href={agent.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          Website
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-4 text-center text-sm">
                    <div>
                      <div className="font-bold text-lg">{agent.totalSales || 0}</div>
                      <div className="text-muted-foreground">Total Sales</div>
                    </div>
                    <div>
                      <div className="font-bold text-lg">{agent.activeListings || 0}</div>
                      <div className="text-muted-foreground">Active Listings</div>
                    </div>
                  </div>

                  <Button asChild className="w-full">
                    <Link href={`/agent/${agent.id}`}>View Profile</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
