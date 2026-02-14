import { DiagnosticsPublisherIntf } from "#PylintWrapper/diagnostics";
import { ExtensionContextIntf } from "#PylintWrapper/vscodeextension";
import { Disposable } from "vscode";

/**
 * VsCode Command (Plugin) Interface
 * 
 * In Domain-Driven Design (DDD), folder dependencies follow a strict inward-pointing rule: outer layers depend on inner layers, with the
Domain at the center. The core dependency chain is Infrastructure → Application → Domain, ensuring business logic remains isolated from technical details. 
Here is a breakdown of the typical DDD folder dependencies:

    Domain Layer (Core/Domain): This is the innermost folder and depends on nothing. It contains entities, value objects, domain events, and repository interfaces.
    Application Layer (Services/Use Cases): Depends only on the Domain folder. It orchestrates domain objects to fulfill use cases and depends on repository interfaces (not implementations).
    Infrastructure Layer (Persistence/API): Depends on both Domain and Application. It implements the technical details, such as database repositories, external API clients, and configuration.
    Interfaces Layer (UI/API Controllers): Depends on the Application layer to trigger use cases. 

Key Principles:

    No Cycles: Domain never depends on Application or Infrastructure.
    Shared Kernel: A Shared or Common folder may exist, which other modules can depend on, but it should not depend on them.
    Bounded Contexts: Each Bounded Context (folder) should be independent, with dependencies minimized between different context folders. 

Example Hierarchy (from most to least dependent):
src/
infrastructure/ -> depends on domain, application
application/ -> depends on domain
domain/ -> depends on nothing
shared/ 
 */
interface CommandIntf {
  /**
   * Registers VsCode command
   * @returns {Disposable}
   */
  register(): Disposable;
}

export default CommandIntf;
